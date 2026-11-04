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
