import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import type { MediaLink } from "../../types/project";
import {
  FIRST_LINK,
  linkRefreshDelayMs,
  nextPhotoLink,
  type PhotoLinkEvent,
} from "../../utils/mediaLink";

export interface PhotoByLinkProps {
  /**
   * Mints a link to the photo's bytes — one call, one fresh link: a record's photo through
   * `projectRecordAPI.mediaLink` (OBT-582), a pending Pulse's image through
   * `formsAPI.pendingImageLink` (OBT-674). Read as an effect event, so a caller that hands a new
   * arrow on every render asks for nothing by doing so.
   */
  ask: () => Promise<MediaLink>;
  /** The photo `ask` reaches: another one is asked for afresh. */
  photoKey: string;
  alt: string;
  /** What the slot shows while there is no picture — before the link, and after any refusal. */
  fallback: ReactNode;
}

/**
 * One photo's bytes, by a link asked for at the moment it is shown (OBT-582) — on the Mídia tab
 * and, since OBT-674, in the Forms inbox. The URL lives in this component's memory and nowhere
 * else — no store, no cache, no storage, no log — and is asked again a minute before it expires
 * and, at most once per failure streak, if the image fails to load (`nextPhotoLink`); after that
 * the slot stays empty. A refusal of any kind (403: not authorized, or a reader the route does
 * not serve; 404: no file) shows no picture and says no reason: the server does not tell which,
 * and neither does the screen.
 */
export function PhotoByLink({ ask, photoKey, alt, fallback }: PhotoByLinkProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [link, setLink] = useState(FIRST_LINK);
  const on = (event: PhotoLinkEvent) => setLink((state) => nextPhotoLink(state, event));
  const { attempt, givenUp } = link;
  const askLink = useEffectEvent(ask);

  useEffect(() => {
    if (givenUp) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    askLink()
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
  }, [photoKey, attempt, givenUp]);

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
