import { useTranslation } from "react-i18next";
import { MATERIAL_KIND_LABEL_KEYS } from "../../../../../constants/project";
import { Badge } from "../../../../ui";
import type { DraftHandle } from "../../useDraft";
import { MaterialStatus } from "./MaterialStatus";

export interface MateriaisViewProps {
  draft: DraftHandle;
}

export function MateriaisView({ draft }: MateriaisViewProps) {
  const { t } = useTranslation();
  const materials = draft.values.materials ?? [];

  if (materials.length === 0) {
    return (
      <p className="rounded-md bg-muted px-4 py-3.5 font-serif text-small italic text-fg-muted">
        {t("materials_empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {materials.map((material, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-3 rounded-md bg-muted px-3.5 py-2.5"
        >
          <Badge tone="accent">{t(MATERIAL_KIND_LABEL_KEYS[material.kind])}</Badge>
          <span className="min-w-40 flex-1 font-serif text-small text-fg">
            {material.scope || "—"}
          </span>
          {material.dataUrl && material.fileName && (
            <a
              href={material.dataUrl}
              download={material.fileName}
              className="text-micro font-bold text-link"
            >
              {t("mat_open")}
            </a>
          )}
          {material.link?.trim() && (
            <a
              href={material.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-micro font-bold text-link"
            >
              {t("mat_open_link")}
            </a>
          )}
          <MaterialStatus material={material} className="flex-none" />
        </div>
      ))}
    </div>
  );
}
