import type {
  MaterialKind,
  StoredImage,
  StoredMaterialFile,
} from "../types/project";

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
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas 2d context unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", WEBP_QUALITY);
}

const MATERIAL_FILE_ACCEPT: Record<MaterialKind, string> = {
  audio: "audio/*",
  video: "video/*",
  text: ".txt,.doc,.docx,.pdf,.usfm,text/*",
};

const MATERIAL_FILE_EXTENSIONS: Record<MaterialKind, readonly string[]> = {
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "opus", "flac"],
  video: ["mp4", "webm", "mov", "m4v"],
  text: ["txt", "doc", "docx", "pdf", "usfm"],
};

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

export function materialFileAccept(kind: MaterialKind): string {
  return MATERIAL_FILE_ACCEPT[kind];
}

export function isAcceptedMaterialFile(
  kind: MaterialKind,
  file: Pick<File, "name" | "type">,
): boolean {
  if (file.type.startsWith(`${kind === "text" ? "text" : kind}/`)) return true;
  return MATERIAL_FILE_EXTENSIONS[kind].includes(fileExtension(file.name));
}

export function materialFormat(file: Pick<File, "name" | "type">): string {
  const extension = fileExtension(file.name);
  if (extension) return extension.toUpperCase();
  const subtype = file.type.split("/")[1];
  return subtype ? subtype.toUpperCase() : "";
}

export async function storeMaterialFile(
  file: File,
): Promise<StoredMaterialFile> {
  return {
    fileName: file.name,
    fileSize: file.size,
    dataUrl: await encodeFile(file),
    format: materialFormat(file),
  };
}

function encodeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

export function readAudioDuration(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    audio.onerror = () => resolve(null);
    audio.src = src;
  });
}
