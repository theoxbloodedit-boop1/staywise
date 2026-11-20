// Keep JSON/base64 transport comfortably below serverless request limits.
export const MAX_EVIDENCE_REQUEST_BYTES = 3_800_000;
export function encodeEvidenceRequest(payload: Record<string, unknown>): string {
  const body = JSON.stringify(payload);
  if (new TextEncoder().encode(body).byteLength > MAX_EVIDENCE_REQUEST_BYTES) {
    throw new Error('Photo too large. Choose a smaller photo or resize it, then retry.');
  }
  return body;
}

/** Mobile photos are resized and re-encoded before transport; server still validates. */
export async function prepareEvidencePhoto(dataUrl: string): Promise<string> {
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(dataUrl)) {
    throw new Error('Unsupported photo format. Choose JPEG, PNG or WebP.');
  }
  if (dataUrl.length > 40_000_000) throw new Error('Photo too large to process. Choose a smaller photo.');
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Cannot read this photo. Choose JPEG, PNG or WebP.'));
    image.src = dataUrl;
  });
  const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo processing unavailable. Choose a smaller JPEG photo.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}
