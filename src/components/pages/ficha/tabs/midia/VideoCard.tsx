import { useTranslation } from "react-i18next";
import type { ProjectVideo } from "../../../../../types/project";
import { hasVideoContent, videoEmbedUrl } from "../../../../../utils/media";
import { AuthStatus, MediaCaption } from "./controls";

export function VideoCard({ video }: { video: ProjectVideo }) {
  const { t } = useTranslation();
  const embed = videoEmbedUrl(video.url);

  return (
    <div className="flex flex-col gap-1.5">
      {embed ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-preto">
          <iframe
            src={embed}
            title={video.caption || t("f_media_video_label")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-[8px] bg-preto p-3 text-center font-serif text-micro italic text-on-dark">
          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="wrap-anywhere text-areia underline"
            >
              <span aria-hidden>▶ </span>
              {video.url}
            </a>
          ) : (
            "—"
          )}
        </div>
      )}
      {video.caption && <MediaCaption>{video.caption}</MediaCaption>}
      {hasVideoContent(video) && <AuthStatus authorization={video.authorization} />}
    </div>
  );
}
