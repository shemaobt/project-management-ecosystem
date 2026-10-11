import { useTranslation } from "react-i18next";
import { photoSlotSurface } from "../../../../../styles";
import { cn } from "../../../../../utils/cn";
import { hasPhotoContent, hasVideoContent, photoSlots } from "../../../../../utils/media";
import { readsFreeText } from "../../../../../utils/recordAccess";
import { CoordinationOnlyNote } from "../../CoordinationOnlyNote";
import { PhotoSlotHint } from "../../../../common/ImageUpload";
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
  // The server empties the captions on a withheld record for whoever does not read the truth
  // (OBT-578): that blank is said as withheld, once, the way the Notas and Saúde tabs say it
  // (§6.1), never left to read as *no caption*.
  const captionsWithheld =
    !readsFreeText(draft.place) &&
    (photos.some((photo) => hasPhotoContent(photo) || photo.authorization !== null) ||
      videos.some(hasVideoContent));

  return (
    <div className="flex flex-col gap-4">
      {values.sensitiveCountry && <SensitiveMediaNote />}
      {captionsWithheld && <CoordinationOnlyNote textKey="f_free_text_coordination_only" />}

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {photos.map((photo, index) => {
          const caption = photo.caption.trim();
          return (
            <div key={index} className="flex flex-col gap-1.5">
              {photo.image ? (
                <img
                  src={photo.image.src}
                  alt={caption || `${t("f_media_photo_label")} ${index + 1}`}
                  className="aspect-[4/3] w-full rounded-[8px] object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "flex aspect-[4/3] w-full rounded-[8px]",
                    photoSlotSurface,
                  )}
                >
                  <PhotoSlotHint>{t("f_media_drop_hint")}</PhotoSlotHint>
                </div>
              )}
              {caption && <MediaCaption>{caption}</MediaCaption>}
              {/* A recorded decision shows even with nothing else in the slot (OBT-580): the
                  server serves no bytes yet and empties the caption for a reader outside the
                  truth, and `granted`/`at` are what that reader is still told. */}
              {(hasPhotoContent(photo) || photo.authorization !== null) && (
                <AuthStatus authorization={photo.authorization} />
              )}
            </div>
          );
        })}
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
