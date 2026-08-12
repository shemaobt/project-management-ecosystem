import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../../contexts/AuthContext";
import type {
  MediaPhoto,
  ProjectVideo,
} from "../../../../../types/project";
import { toLocalIsoDate } from "../../../../../utils/format";
import {
  hasPhotoContent,
  hasVideoContent,
  makeEmptyVideo,
  makeMediaAuthorization,
  photoSlots,
  prunePhotoAuthorization,
  withPhotoImage,
  withVideoUrl,
} from "../../../../../utils/media";
import { ImageUpload } from "../../../../common/ImageUpload";
import { RemoveRowButton } from "../../../../common/RemoveRowButton";
import { Button, Input, toast } from "../../../../ui";
import type { DraftHandle } from "../../useDraft";
import {
  AuthToggle,
  MediaHeading,
  SensitiveMediaNote,
} from "./controls";

export interface MidiaFormProps {
  draft: DraftHandle;
}

export function MidiaForm({ draft }: MidiaFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const values = draft.values;
  const photos = photoSlots(values.mediaPhotos);
  const videos = values.mediaVideos ?? [];

  const decide = (granted: boolean) =>
    makeMediaAuthorization(granted, user.name, toLocalIsoDate());

  const patchPhoto = (index: number, next: MediaPhoto) =>
    draft.set(
      "mediaPhotos",
      photos.map((photo, i) =>
        i === index ? prunePhotoAuthorization(next) : photo,
      ),
    );

  const setVideos = (next: ProjectVideo[]) => draft.set("mediaVideos", next);
  const patchVideo = (index: number, next: ProjectVideo) =>
    setVideos(videos.map((video, i) => (i === index ? next : video)));

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-sm border-l-[3px] border-verde-claro bg-verde-claro/10 px-3.5 py-2.5 font-serif text-micro italic text-fg">
        {t("f_media_intro")}
      </p>
      <p className="rounded-sm border-l-[3px] border-telha bg-accent-soft px-3.5 py-2.5 font-serif text-micro italic text-fg">
        {t("media_auth_intro")}
      </p>
      {values.sensitiveCountry && <SensitiveMediaNote />}

      <MediaHeading emoji="📸">{t("f_media_photos_title")}</MediaHeading>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <ImageUpload
              id={`midia-foto-${index}`}
              value={photo.image}
              onChange={(image) => patchPhoto(index, withPhotoImage(photo, image))}
              onRejected={() => toast.error(t("media_invalid_type"))}
              placeholder={t("f_media_drop_hint")}
              removeLabel={`${t("row_remove")} · ${t("f_media_photo_label")} ${index + 1}`}
            />
            <Input
              aria-label={`${t("f_media_caption")} · ${t("f_media_photo_label")} ${index + 1}`}
              className="px-2 py-1.5 text-micro"
              value={photo.caption}
              placeholder={t("f_media_caption")}
              onChange={(event) =>
                patchPhoto(index, { ...photo, caption: event.target.value })
              }
            />
            <AuthToggle
              id={`midia-foto-auth-${index}`}
              authorization={photo.authorization}
              disabled={!hasPhotoContent(photo)}
              onDecide={(granted) =>
                patchPhoto(index, { ...photo, authorization: decide(granted) })
              }
            />
          </div>
        ))}
      </div>

      <MediaHeading emoji="🎥">{t("f_media_videos_title")}</MediaHeading>
      <div className="flex flex-col gap-3">
        {videos.map((video, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_28px] items-center gap-2">
              <Input
                aria-label={`${t("f_media_video_label")} ${index + 1}`}
                value={video.url}
                placeholder={t("f_media_video_label")}
                spellCheck={false}
                onChange={(event) =>
                  patchVideo(index, withVideoUrl(video, event.target.value))
                }
              />
              <Input
                aria-label={`${t("f_media_caption")} · ${t("f_media_videos_title")} ${index + 1}`}
                value={video.caption ?? ""}
                placeholder={t("f_media_caption")}
                onChange={(event) =>
                  patchVideo(index, { ...video, caption: event.target.value })
                }
              />
              <RemoveRowButton
                label={`${t("row_remove")} · ${t("f_media_videos_title")} ${index + 1}`}
                onClick={() => setVideos(videos.filter((_, i) => i !== index))}
              />
            </div>
            <AuthToggle
              id={`midia-video-auth-${index}`}
              authorization={video.authorization}
              disabled={!hasVideoContent(video)}
              onDecide={(granted) =>
                patchVideo(index, { ...video, authorization: decide(granted) })
              }
            />
          </div>
        ))}
        <Button
          variant="secondary"
          block
          onClick={() => setVideos([...videos, makeEmptyVideo()])}
        >
          {t("f_media_add_video")}
        </Button>
      </div>
    </div>
  );
}
