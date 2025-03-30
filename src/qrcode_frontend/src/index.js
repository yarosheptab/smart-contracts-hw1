import { qrcode_backend } from "../../declarations/qrcode_backend";
import "./styles.css";

document.getElementById("form").onsubmit = onGenerateButtonClick;
document.getElementById("animated").onchange = toggleAnimationControls;
document.getElementById("add-color").onclick = addColorInput;

let animationInterval = null;

function toggleAnimationControls(event) {
    const controls = document.getElementById("animation-controls");
    controls.style.display = event.target.checked ? "block" : "none";
    if (!event.target.checked && animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

function addColorInput() {
    const colorsDiv = document.getElementById("colors");
    const input = document.createElement("input");
    input.type = "color";
    input.value = generateRandomColor();
    colorsDiv.appendChild(input);
}

function generateRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function onGenerateButtonClick(event) {
    event.preventDefault();

    const buttonElement = document.getElementById("generate");
    const messageElement = document.getElementById("message");
    const imageElement = document.getElementById("qrcode");
    const linkElement = document.getElementById("download");

    // Clear the state of all elements
    buttonElement.disabled = true;
    buttonElement.textContent = "Generating...";
    messageElement.innerText = "";
    imageElement.style.display = "none";
    linkElement.style.display = "none";

    // Stop any existing animation
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    try {
        // Get the user input
        const text = document.getElementById("text").value.toString();
        const options = {
            add_logo: document.getElementById("logo").checked,
            add_gradient: document.getElementById("gradient").checked,
            add_transparency: document.getElementById("transparent").checked
                ? [true]
                : [],
            animation: [], // Initialize as empty array for Option<AnimationOptions>
        };

        // Add animation options if enabled
        if (document.getElementById("animated").checked) {
            const frames = parseInt(document.getElementById("frames").value);
            const colors = Array.from(
                document.getElementById("colors").children
            ).map((input) => input.value);

            if (colors.length < 2) {
                throw new Error("Please add at least 2 colors for animation");
            }

            console.log("Animation options:", {
                frames,
                colors,
            });

            // Set animation options as Some(AnimationOptions)
            options.animation = [
                {
                    frames: frames,
                    colors: colors,
                },
            ];
        }

        console.log(
            "Sending options to backend:",
            JSON.stringify(options, null, 2)
        );

        // Call the backend and wait for the result
        let result;
        try {
            // Always use update call for animated QR codes
            if (document.getElementById("animated").checked) {
                result = await qrcode_backend.qrcode(text, options);
            } else if (document.getElementById("consensus").checked) {
                result = await qrcode_backend.qrcode(text, options);
            } else {
                result = await qrcode_backend.qrcode_query(text, options);
            }

            console.log("Backend response type:", Object.keys(result)[0]);
            console.log("Backend response:", result);

            if ("Err" in result) {
                throw result.Err;
            }

            // Handle the result
            if ("Images" in result) {
                // Handle animated QR code
                const images = result.Images;
                console.log("Number of frames received:", images.length);
                let currentFrame = 0;

                // Convert all frames to data URLs
                const urls = await Promise.all(
                    images.map(async (image) => {
                        const blob = new Blob([image], { type: "image/png" });
                        return await convertToDataUrl(blob);
                    })
                );

                console.log("Converted frames to URLs:", urls.length);

                // Show success message
                messageElement.innerHTML = `
                    <div style="color: var(--success-color)">
                        ✨ QR code generated successfully!
                        ${
                            options.animation.length > 0
                                ? "<br>Animation is playing..."
                                : ""
                        }
                    </div>
                `;

                // Set up the display
                imageElement.style.display = "inline-block";
                imageElement.width = Math.min(
                    400,
                    document.getElementById("text").clientWidth
                );
                linkElement.style.display = "inline-block";

                // Set initial frame
                imageElement.src = urls[0];
                linkElement.href = urls[0];

                // Animate through frames
                if (animationInterval) {
                    clearInterval(animationInterval);
                }
                console.log("Starting animation interval");
                animationInterval = setInterval(() => {
                    currentFrame = (currentFrame + 1) % urls.length;
                    console.log("Switching to frame:", currentFrame);
                    imageElement.src = urls[currentFrame];
                    linkElement.href = urls[currentFrame];
                }, 1000); // Change frame every 1 second for better visibility
            } else {
                // Handle single QR code
                const blob = new Blob([result.Image], { type: "image/png" });
                const url = await convertToDataUrl(blob);

                // Show success message
                messageElement.innerHTML = `
                    <div style="color: var(--success-color)">
                        ✨ QR code generated successfully!
                    </div>
                `;

                // Display the image
                imageElement.style.display = "inline-block";
                imageElement.width = Math.min(
                    400,
                    document.getElementById("text").clientWidth
                );
                imageElement.src = url;

                // Update download link
                linkElement.style.display = "inline-block";
                linkElement.href = url;
            }
        } catch (error) {
            console.error("Error:", error);
            messageElement.innerHTML = `
                <div style="color: var(--error-color)">
                    ❌ Error: ${error.message || "Failed to generate QR code"}
                </div>
            `;
            imageElement.style.display = "none";
            linkElement.style.display = "none";
        }
    } catch (err) {
        messageElement.innerHTML = `
            <div style="color: #dc3545">
                ❌ Failed to generate QR code: ${err.toString()}
            </div>
        `;
        imageElement.style.display = "none";
        linkElement.style.display = "none";
    }

    // Reset button state
    buttonElement.disabled = false;
    buttonElement.textContent = "Generate QR Code";
}

// Converts the given blob into a data url
function convertToDataUrl(blob) {
    return new Promise((resolve, _) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        fileReader.onloadend = function () {
            resolve(fileReader.result);
        };
    });
}

// Initialize the animation controls visibility and ensure at least 2 colors
document.addEventListener("DOMContentLoaded", () => {
    toggleAnimationControls({ target: document.getElementById("animated") });

    // Ensure we have at least 2 colors with contrasting colors
    const colorsDiv = document.getElementById("colors");
    while (colorsDiv.children.length < 2) {
        const input = document.createElement("input");
        input.type = "color";
        input.value = colorsDiv.children.length === 0 ? "#FF0000" : "#0000FF"; // Red and Blue by default
        colorsDiv.appendChild(input);
    }
});
