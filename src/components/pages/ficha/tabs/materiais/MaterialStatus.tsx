import { useTranslation } from "react-i18next";
import type { ProjectMaterial } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { formatDuration } from "../../../../../utils/format";
import { hasMaterialContent } from "../../../../../utils/media";

function materialFileMeta(material: ProjectMaterial): string {
  const parts = [material.fileName ?? ""];
  if (material.kind === "audio") {
    if (material.format) parts.push(material.format);
    if (material.durationSeconds !== undefined) {
      parts.push(formatDuration(material.durationSeconds));
    }
  }
  return parts.filter(Boolean).join(" · ");
}

export interface MaterialStatusProps {
  material: ProjectMaterial;
  className?: string;
}

export function MaterialStatus({ material, className }: MaterialStatusProps) {
  const { t } = useTranslation();
  const hasFile = Boolean(material.fileName);

  return (
    <span
      className={cn(
        "font-serif text-micro",
        hasMaterialContent(material) ? "text-fg" : "text-fg-subtle",
        className,
      )}
    >
      {hasFile && <span aria-hidden>✓ </span>}
      {hasFile
        ? materialFileMeta(material)
        : material.link?.trim()
          ? t("mat_has_link")
          : t("mat_no_file")}
    </span>
  );
}
