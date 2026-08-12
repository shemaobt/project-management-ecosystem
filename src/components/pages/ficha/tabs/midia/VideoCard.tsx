import { useTranslation } from "react-i18next";
import type { ProjectVideo } from "../../../../../types/project";
import { hasVideoContent, videoEmbedUrl } from "../../../../../utils/media";
import { AuthStatus, MediaCaption } from "./controls";

export function VideoCard({ video }: { video: ProjectVideo }) {
  const { t } = useTranslation();
  const embed = videoEmbedUrl(video.url);
  const caption = video.caption?.trim();

  return (
    <div className="flex flex-col gap-1.5">
      {embed ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-preto">
          <iframe
            src={embed}
            title={caption || t("f_media_video_label")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-[8px] bg-preto p-3 text-center font-serif text-micro italic text-on-dark">
          {hasVideoContent(video) ? (
            <a
              href={video.url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="wrap-anywhere text-areia underline"
            >
              <span aria-hidden>▶ </span>
              {video.url.trim()}
            </a>
          ) : (
            "—"
          )}
        </div>
      )}
      {caption && <MediaCaption>{caption}</MediaCaption>}
      {hasVideoContent(video) && <AuthStatus authorization={video.authorization} />}
    </div>
  );
}
