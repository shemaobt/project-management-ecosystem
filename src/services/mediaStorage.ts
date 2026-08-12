import type { StoredImage } from "../types/project";

const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
];

export const IMAGE_FILE_ACCEPT: string = ACCEPTED_IMAGE_TYPES.join(",");

const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 0.85;

export function isAcceptedImageFile(file: Pick<File, "type">): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export async function storeImageFile(file: File): Promise<StoredImage> {
  return { src: await encodeImage(file), fileName: file.name };
}

async function encodeImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return readAsDataUrl(file);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/webp", WEBP_QUALITY);
  } catch {
    return readAsDataUrl(file);
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("unreadable image file"));
    reader.readAsDataURL(file);
  });
}
