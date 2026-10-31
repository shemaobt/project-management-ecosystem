import type { ReactNode } from "react";
import { projectRecordAPI } from "../../../../../services/api";
import { PhotoByLink } from "../../../../common/PhotoByLink";

export interface MediaPhotoImageProps {
  projectId: string;
  itemId: string;
  alt: string;
  /** What the slot shows while there is no picture — before the link, and after any refusal. */
  fallback: ReactNode;
}

/**
 * A record's photo (OBT-582): the media item's link, asked through `PhotoByLink`, which owns
 * when it is asked, where the URL lives and what a refusal shows.
 */
export function MediaPhotoImage({ projectId, itemId, alt, fallback }: MediaPhotoImageProps) {
  return (
    <PhotoByLink
      photoKey={`${projectId}/${itemId}`}
      ask={() => projectRecordAPI.mediaLink(projectId, itemId)}
      alt={alt}
      fallback={fallback}
    />
  );
}
