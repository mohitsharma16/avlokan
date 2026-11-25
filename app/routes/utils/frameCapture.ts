/**
 * Capture the current frame of a <video> element as a base64 JPEG string.
 */
export function captureVideoFrame(
    videoEl: HTMLVideoElement,
    quality: number = 0.85
): string {
    if (videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
        throw new Error("Wait for the video frame to load and try again.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas 2D context");

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    // Return raw base64 (no data URL prefix)
    const frame = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (!frame) throw new Error("Could not capture this frame. Please try again.");
    return frame;
}
