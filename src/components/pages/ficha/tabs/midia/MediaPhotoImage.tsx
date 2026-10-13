import { useEffect, useState, type ReactNode } from "react";
import { projectRecordAPI } from "../../../../../services/api";
import {
  FIRST_LINK,
  linkRefreshDelayMs,
  nextPhotoLink,
  type PhotoLinkEvent,
} from "../../../../../utils/mediaLink";

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
 * and is asked again a minute before it expires and, at most once per failure streak, if the
 * image fails to load (`nextPhotoLink`); after that the slot stays empty. A
 * refusal of any kind (403: not authorized, or not the coordination of a withheld project;
 * 404: no file) shows no picture and says no reason: the server does not tell which, and
 * neither does the screen.
 */
export function MediaPhotoImage({ projectId, itemId, alt, fallback }: MediaPhotoImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [link, setLink] = useState(FIRST_LINK);
  const on = (event: PhotoLinkEvent) => setLink((state) => nextPhotoLink(state, event));
  const { attempt, givenUp } = link;

  useEffect(() => {
    if (givenUp) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    projectRecordAPI
      .mediaLink(projectId, itemId)
      .then((answer) => {
        if (!live) return;
        setUrl(answer.url);
        timer = setTimeout(() => on("expiring"), linkRefreshDelayMs(answer.expiresInMinutes));
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [projectId, itemId, attempt, givenUp]);

  return (
    <div data-photo-link="" className="contents">
      {url === null || givenUp ? (
        fallback
      ) : (
        <img
          src={url}
          alt={alt}
          className="aspect-[4/3] w-full rounded-[8px] object-cover"
          onLoad={() => on("imageLoaded")}
          onError={() => {
            setUrl(null);
            on("imageFailed");
          }}
        />
      )}
    </div>
  );
}
