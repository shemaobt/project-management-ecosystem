import { useTranslation } from "react-i18next";
import type { Project, ProjectPriority } from "../../../../types/project";
import { cn } from "../../../../utils/cn";
import { getPriority } from "../../../../utils/health";
import { getProgress } from "../../../../utils/progress";
import { getLocationDisplay } from "../../../../utils/region";

const MEDALLION_TONES: Partial<Record<ProjectPriority, string>> = {
  warning:
    "border-[rgba(140,100,30,0.45)] shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_36px_rgba(224,162,74,0.30)]",
  critical:
    "border-telha/55 shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_40px_rgba(190,74,1,0.35)]",
  completed:
    "border-verde-claro/50 shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_36px_rgba(119,125,69,0.28)]",
};

const TAG_TONES: Partial<Record<ProjectPriority, string>> = {
  warning: "bg-night-warning",
  critical: "bg-night-critical",
  completed: "bg-night-good",
};

const PHOTO_BACKGROUND = [
  "radial-gradient(circle at 30% 22%, rgba(190,74,1,0.38) 0%, transparent 55%)",
  "radial-gradient(circle at 78% 78%, rgba(63,62,32,0.40) 0%, transparent 55%)",
  "linear-gradient(135deg, var(--shema-verde-claro) 0%, var(--shema-verde) 100%)",
].join(", ");

export interface MedallionProps {
  project: Project;
  onClose: () => void;
  onOpen?: () => void;
}

export function Medallion({ project, onClose, onOpen }: MedallionProps) {
  const { t } = useTranslation();
  const progress = getProgress(project);
  const priority = getPriority(project);
  const speakers = Number(project.speakerCount) || 0;
  const location = getLocationDisplay(project);

  return (
    <div
      className={cn(
        "relative flex w-full animate-(--animate-slide-up) flex-col items-center rounded-md border border-telha/30 bg-linear-[155deg,var(--shema-branco)_0%,var(--medallion-paper)_100%] px-3.5 pt-3.5 pb-4 font-sans",
        "shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_0_1px_rgba(190,74,1,0.10),0_0_36px_rgba(190,74,1,0.25)]",
        MEDALLION_TONES[priority],
      )}
    >
      <button
        type="button"
        onClick={onClose}
        title={t("btn_close")}
        className="absolute top-1 right-1 inline-flex size-[22px] items-center justify-center rounded-pill bg-verde/10 text-[16px] leading-none text-verde transition-all duration-fast ease-out hover:bg-telha hover:text-branco"
      >
        ×
      </button>

      <div
        className="relative mt-2 mb-3.5 flex size-24 shrink-0 items-center justify-center overflow-visible rounded-pill shadow-[0_0_0_2px_var(--shema-telha),0_4px_14px_rgba(0,0,0,0.30),inset_0_-10px_24px_rgba(0,0,0,0.20)]"
        style={{ background: PHOTO_BACKGROUND }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-1.5 rounded-pill"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, rgba(246,245,235,0.18) 0%, transparent 40%)",
          }}
        />
        <div
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-pill bg-telha px-2 py-0.5 text-[9px] font-extrabold tracking-[0.16em] whitespace-nowrap text-branco uppercase shadow-[0_2px_6px_rgba(0,0,0,0.5)]",
            TAG_TONES[priority],
          )}
        >
          {project.languageCode || "—"}
        </div>
      </div>

      <div className="mt-1 line-clamp-2 max-w-full text-center text-small leading-[1.15] font-bold tracking-[-0.005em] text-balance text-verde">
        {project.languageName}
      </div>
      <div className="mt-0.5 mb-2 text-center font-serif text-tag leading-[1.3] italic text-fg-muted">
        {location.withheld
          ? t(location.regionLabelKey)
          : project.location.split("—")[0].split(",")[0].trim() || "—"}
      </div>
      {location.withheld && (
        <div className="-mt-1 mb-2 text-center font-serif text-[10px] leading-[1.3] italic text-telha">
          {t("atlas_sensitive_marker")}
        </div>
      )}

      {project.portion && (
        <div className="mb-2 w-full rounded-[6px] bg-accent-soft px-2 py-1 text-center font-serif text-tag leading-[1.3] italic text-telha">
          📖 {project.portion}
        </div>
      )}

      <div className="grid w-full grid-cols-2 border-y border-verde/18 pt-1.5 pb-2">
        <div className="flex flex-col items-center leading-[1.1]">
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-telha tabular-nums">
            {Math.round(progress)}
            <small className="text-[10px] font-semibold">%</small>
          </span>
          <span className="mt-0.5 text-[8px] font-bold tracking-[0.12em] uppercase text-fg-muted">
            {t("d_p_translated").split(" ")[0]}
          </span>
        </div>
        <div className="flex flex-col items-center border-l border-verde/14 leading-[1.1]">
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-telha tabular-nums">
            {speakers > 1000 ? `${Math.round(speakers / 1000)}k` : speakers || "—"}
          </span>
          <span className="mt-0.5 text-[8px] font-bold tracking-[0.12em] uppercase text-fg-muted">
            {t("d_speakers")}
          </span>
        </div>
      </div>

      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="mt-2.5 w-full rounded-pill bg-telha p-2 text-[10px] font-bold tracking-[0.08em] uppercase text-branco transition-all duration-fast ease-out hover:-translate-y-px hover:bg-accent-hover"
        >
          {t("atlas_open_project")}
        </button>
      )}
    </div>
  );
}
