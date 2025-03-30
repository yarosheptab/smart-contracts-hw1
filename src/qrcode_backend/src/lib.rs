use candid::{CandidType, Deserialize};
use std::include_bytes;
use ic_cdk::api::management_canister::http_request::{HttpResponse, TransformArgs, HttpHeader};

mod core;

const IMAGE_SIZE_IN_PIXELS: usize = 1024;
const LOGO_TRANSPARENT: &[u8] = include_bytes!("../assets/logo_transparent.png");
const LOGO_WHITE: &[u8] = include_bytes!("../assets/logo_white.png");

#[derive(CandidType, Deserialize, Clone, Debug)]
struct Options {
    add_logo: bool,
    add_gradient: bool,
    add_transparency: Option<bool>,
    animation: Option<AnimationOptions>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct AnimationOptions {
    frames: u8,
    colors: Vec<String>,
}

#[derive(CandidType, Deserialize)]
struct QrError {
    message: String,
}

#[derive(CandidType, Deserialize)]
enum QrResult {
    Image(Vec<u8>),
    Images(Vec<Vec<u8>>),
    Err(QrError),
}

#[ic_cdk::update]
fn http_request_update(arg: HttpResponse) -> HttpResponse {
    let mut response = arg;
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Origin".to_string(),
        value: "*".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Methods".to_string(),
        value: "POST, GET, OPTIONS".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Headers".to_string(),
        value: "Content-Type".to_string(),
    });
    response
}

#[ic_cdk::query]
fn http_request(arg: HttpResponse) -> HttpResponse {
    let mut response = arg;
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Origin".to_string(),
        value: "*".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Methods".to_string(),
        value: "POST, GET, OPTIONS".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Headers".to_string(),
        value: "Content-Type".to_string(),
    });
    response
}

#[ic_cdk::query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut response = HttpResponse {
        status: args.response.status.clone(),
        body: args.response.body,
        headers: args.response.headers,
    };
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Origin".to_string(),
        value: "*".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Methods".to_string(),
        value: "POST, GET, OPTIONS".to_string(),
    });
    response.headers.push(HttpHeader {
        name: "Access-Control-Allow-Headers".to_string(),
        value: "Content-Type".to_string(),
    });
    response
}

fn qrcode_impl(input: String, options: Options) -> QrResult {
    ic_cdk::println!("Received options: {:?}", options);
    let logo = if options.add_transparency == Some(true) {
        LOGO_TRANSPARENT
    } else {
        LOGO_WHITE
    };

    if let Some(ref animation) = options.animation {
        ic_cdk::println!("Processing animation options: {:?}", animation);
        let result = match core::generate_animated(input, &options, logo, IMAGE_SIZE_IN_PIXELS, animation) {
            Ok(blobs) => {
                ic_cdk::println!("Generated {} frames", blobs.len());
                QrResult::Images(blobs)
            },
            Err(err) => {
                ic_cdk::println!("Error generating animated QR code: {}", err);
                QrResult::Err(QrError {
                    message: err.to_string(),
                })
            },
        };
        ic_cdk::println!(
            "Executed instructions: {}",
            ic_cdk::api::performance_counter(0)
        );
        return result;
    }

    let result = match core::generate(input, options, logo, IMAGE_SIZE_IN_PIXELS) {
        Ok(blob) => QrResult::Image(blob),
        Err(err) => QrResult::Err(QrError {
            message: err.to_string(),
        }),
    };
    ic_cdk::println!(
        "Executed instructions: {}",
        ic_cdk::api::performance_counter(0)
    );
    result
}

#[ic_cdk::update]
fn qrcode(input: String, options: Options) -> QrResult {
    qrcode_impl(input, options)
}

#[ic_cdk::query]
fn qrcode_query(input: String, options: Options) -> QrResult {
    qrcode_impl(input, options)
}
