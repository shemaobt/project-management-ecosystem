import { useTranslation } from "react-i18next";
import { photoSlotSurface } from "../../../../../styles";
import { cn } from "../../../../../utils/cn";
import { hasPhotoContent, photoSlots } from "../../../../../utils/media";
import type { DraftHandle } from "../../useDraft";
import {
  AuthStatus,
  MediaCaption,
  MediaHeading,
  SensitiveMediaNote,
} from "./controls";
import { VideoCard } from "./VideoCard";

export interface MidiaViewProps {
  draft: DraftHandle;
}

export function MidiaView({ draft }: MidiaViewProps) {
  const { t } = useTranslation();
  const values = draft.values;
  const photos = photoSlots(values.mediaPhotos);
  const videos = values.mediaVideos ?? [];

  return (
    <div className="flex flex-col gap-4">
      {values.sensitiveCountry && <SensitiveMediaNote />}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            {photo.image ? (
              <img
                src={photo.image.src}
                alt={photo.caption || `${t("f_media_photo_label")} ${index + 1}`}
                className="aspect-[4/3] w-full rounded-[8px] object-cover"
              />
            ) : (
              <div
                className={cn(
                  "flex aspect-[4/3] w-full items-center justify-center rounded-[8px] px-2 text-center font-serif text-[11px] italic text-on-dark",
                  photoSlotSurface,
                )}
              >
                {t("f_media_drop_hint")}
              </div>
            )}
            {photo.caption && <MediaCaption>{photo.caption}</MediaCaption>}
            {hasPhotoContent(photo) && (
              <AuthStatus authorization={photo.authorization} />
            )}
          </div>
        ))}
      </div>

      {videos.length > 0 && (
        <>
          <MediaHeading emoji="🎥" className="mt-1.5">
            {t("f_media_videos_title")}
          </MediaHeading>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {videos.map((video, index) => (
              <VideoCard key={index} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
