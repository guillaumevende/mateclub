const AUDIO_MIME_SIGNATURES = {
  "audio/webm": [26, 69, 223, 163],
  // WebM
  "audio/mp4": [0, 0, 0, null, 102, 116, 121, 112],
  // MP4/M4A (ftyp)
  "audio/mpeg": [255, 251],
  // MP3
  "audio/ogg": [79, 103, 103, 83]
  // OGG
};
const IMAGE_MIME_SIGNATURES = {
  "image/jpeg": [255, 216, 255],
  // JPEG
  "image/png": [137, 80, 78, 71],
  // PNG
  "image/webp": [82, 73, 70, 70, null, null, null, null, 87, 69, 66, 80]
  // RIFF....WEBP
};
function getBufferSignature(buffer, length = 12) {
  return Array.from(buffer.slice(0, length));
}
function matchesSignature(buffer, signature) {
  const sig = getBufferSignature(buffer);
  return signature.every((byte, i) => byte === null || byte === sig[i]);
}
function isValidAudioBuffer(buffer) {
  const knownFormats = Object.values(AUDIO_MIME_SIGNATURES);
  for (const signature of knownFormats) {
    if (matchesSignature(buffer, signature)) {
      return true;
    }
  }
  return false;
}
function isValidImageBuffer(buffer) {
  const knownFormats = Object.values(IMAGE_MIME_SIGNATURES);
  for (const signature of knownFormats) {
    if (matchesSignature(buffer, signature)) {
      return true;
    }
  }
  return false;
}
export {
  isValidAudioBuffer as a,
  isValidImageBuffer as i
};
