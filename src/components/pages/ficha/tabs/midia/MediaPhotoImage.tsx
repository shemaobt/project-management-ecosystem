import { useEffect, useState, type ReactNode } from "react";
import { projectRecordAPI } from "../../../../../services/api";
import { linkRefreshDelayMs } from "../../../../../utils/mediaLink";

export interface MediaPhotoImageProps {
  projectId: string;
  itemId: string;
  alt: string;
  /** What the slot shows while there is no picture — before the link, and after any refusal. */
  fallback: ReactNode;
}

/**
 * One server photo's bytes, by a link asked for at the moment it is shown (OBT-582). The URL
 * lives in this component's memory and nowhere else — no store, no cache, no storage, no log —
 * and is asked again a minute before it expires and once more if the image fails to load. A
 * refusal of any kind (403: not authorized, or not the coordination of a withheld project;
 * 404: no file) shows no picture and says no reason: the server does not tell which, and
 * neither does the screen.
 */
export function MediaPhotoImage({ projectId, itemId, alt, fallback }: MediaPhotoImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    projectRecordAPI
      .mediaLink(projectId, itemId)
      .then((link) => {
        if (!live) return;
        setUrl(link.url);
        timer = setTimeout(() => setAttempt((n) => n + 1), linkRefreshDelayMs(link.expiresInMinutes));
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [projectId, itemId, attempt]);

  if (url === null) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-[4/3] w-full rounded-[8px] object-cover"
      onError={() => {
        setUrl(null);
        setAttempt((n) => n + 1);
      }}
    />
  );
}
