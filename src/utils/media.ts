import { MEDIA_PHOTO_SLOTS } from "../constants/project";
import type {
  MediaAudience,
  MediaAuthorization,
  MediaPhoto,
  Project,
  ProjectMaterial,
  ProjectVideo,
  StoredImage,
  StoredMaterialFile,
} from "../types/project";

export interface MediaAuthorizable {
  authorization?: MediaAuthorization | null;
}

export function makeEmptyMediaPhoto(): MediaPhoto {
  return { image: null, caption: "", authorization: null };
}

export function makeEmptyVideo(): ProjectVideo {
  return { url: "", caption: "", authorization: null };
}

export function makeEmptyMaterial(): ProjectMaterial {
  return { kind: "text", scope: "", authorization: null };
}

export function photoSlots(
  photos: readonly MediaPhoto[] | undefined,
): MediaPhoto[] {
  const length = Math.max(MEDIA_PHOTO_SLOTS, photos?.length ?? 0);
  return Array.from(
    { length },
    (_, index) => photos?.[index] ?? makeEmptyMediaPhoto(),
  );
}

export function hasPhotoContent(photo: MediaPhoto): boolean {
  return photo.image !== null || photo.caption.trim() !== "";
}

export function hasVideoContent(video: ProjectVideo): boolean {
  return video.url.trim() !== "";
}

export function hasMaterialContent(material: ProjectMaterial): boolean {
  return Boolean(material.dataUrl) || Boolean(material.link?.trim());
}

export function makeMediaAuthorization(
  granted: boolean,
  by: string | null,
  at: string,
): MediaAuthorization {
  return { granted, by: by ?? "", at };
}

export function withPhotoImage(
  photo: MediaPhoto,
  image: StoredImage | null,
): MediaPhoto {
  return { ...photo, image, authorization: null };
}

export function prunePhotoAuthorization(photo: MediaPhoto): MediaPhoto {
  if (hasPhotoContent(photo)) return photo;
  return { ...photo, authorization: null };
}

export function withVideoUrl(video: ProjectVideo, url: string): ProjectVideo {
  return { ...video, url, authorization: null };
}

export function withMaterialFile(
  material: ProjectMaterial,
  file: StoredMaterialFile,
): ProjectMaterial {
  return {
    ...material,
    ...file,
    durationSeconds: undefined,
    authorization: null,
  };
}

export function withMaterialLink(
  material: ProjectMaterial,
  link: string,
): ProjectMaterial {
  return { ...material, link, authorization: null };
}

export function isMediaAuthorized(item: MediaAuthorizable): boolean {
  return item.authorization?.granted === true;
}

export type MediaScope = Pick<
  Project,
  "sensitiveCountry" | "mediaPhotos" | "mediaVideos" | "materials"
>;

export function canShareMedia(
  project: Pick<Project, "sensitiveCountry">,
  item: MediaAuthorizable,
  audience: MediaAudience,
): boolean {
  if (!isMediaAuthorized(item)) return false;
  if (audience === "publico" && project.sensitiveCountry) return false;
  return true;
}

export interface ShareableMedia {
  photos: MediaPhoto[];
  videos: ProjectVideo[];
  materials: ProjectMaterial[];
}

export function getShareableMedia(
  project: MediaScope,
  audience: MediaAudience,
): ShareableMedia {
  return {
    photos: (project.mediaPhotos ?? []).filter(
      (photo) => hasPhotoContent(photo) && canShareMedia(project, photo, audience),
    ),
    videos: (project.mediaVideos ?? []).filter(
      (video) => hasVideoContent(video) && canShareMedia(project, video, audience),
    ),
    materials: project.materials.filter(
      (material) =>
        hasMaterialContent(material) &&
        canShareMedia(project, material, audience),
    ),
  };
}

export function videoEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  let match = trimmed.match(/youtu\.be\/([\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  match = trimmed.match(/[?&]v=([\w-]+)/);
  if (match && trimmed.includes("youtube")) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  match = trimmed.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  match = trimmed.match(/vimeo\.com\/(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  if (
    trimmed.startsWith("https://www.youtube.com/embed/") ||
    trimmed.startsWith("https://player.vimeo.com/video/")
  ) {
    return trimmed;
  }
  return null;
}
