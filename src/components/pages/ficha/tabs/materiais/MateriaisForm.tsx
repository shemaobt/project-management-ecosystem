import { useTranslation } from "react-i18next";
import {
  MATERIAL_KINDS,
  MATERIAL_KIND_LABEL_KEYS,
} from "../../../../../constants/project";
import {
  isAcceptedMaterialFile,
  materialFileAccept,
  readAudioDuration,
  storeMaterialFile,
} from "../../../../../services/mediaStorage";
import type {
  MaterialKind,
  ProjectMaterial,
} from "../../../../../types/project";
import { makeEmptyMaterial } from "../../../../../utils/media";
import { RemoveRowButton } from "../../../../common/RemoveRowButton";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "../../../../ui";
import type { DraftHandle } from "../../useDraft";
import { MaterialStatus } from "./MaterialStatus";

export interface MateriaisFormProps {
  draft: DraftHandle;
}

export function MateriaisForm({ draft }: MateriaisFormProps) {
  const { t } = useTranslation();
  const materials = draft.values.materials ?? [];

  const updateMaterials = (
    transform: (current: ProjectMaterial[]) => ProjectMaterial[],
  ) => draft.update("materials", (current) => transform(current ?? []));

  const patchMaterial = (index: number, patch: Partial<ProjectMaterial>) =>
    updateMaterials((current) =>
      current.map((material, i) =>
        i === index ? { ...material, ...patch } : material,
      ),
    );

  const importFile = async (
    index: number,
    kind: MaterialKind,
    file: File | undefined,
  ) => {
    if (!file) return;
    if (!isAcceptedMaterialFile(kind, file)) {
      toast.error(t("mat_invalid_type"));
      return;
    }
    try {
      const stored = await storeMaterialFile(file);
      patchMaterial(index, { ...stored, durationSeconds: undefined });
      if (kind === "audio") {
        const duration = await readAudioDuration(stored.dataUrl);
        if (duration !== null) {
          patchMaterial(index, { durationSeconds: duration });
        }
      }
    } catch {
      toast.error(t("mat_invalid_type"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-sm border-l-[3px] border-verde-claro bg-verde-claro/10 px-3.5 py-2.5 font-serif text-micro italic text-fg">
        {t("f_materials_hint")}
      </p>

      <div className="flex flex-col gap-2.5">
        {materials.map((material, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-md border border-line bg-elevated p-3.5"
          >
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[168px_minmax(0,1fr)_28px]">
              <Select
                value={material.kind}
                onValueChange={(next) => {
                  const kind = MATERIAL_KINDS.find((entry) => entry === next);
                  if (kind) patchMaterial(index, { kind });
                }}
              >
                <SelectTrigger aria-label={t("mat_kind_label")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(MATERIAL_KIND_LABEL_KEYS[kind])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label={t("mat_scope")}
                placeholder={t("mat_scope")}
                value={material.scope}
                onChange={(event) =>
                  patchMaterial(index, { scope: event.target.value })
                }
              />
              <RemoveRowButton
                label={`${t("row_remove")} · ${t(MATERIAL_KIND_LABEL_KEYS[material.kind])} ${index + 1}`}
                onClick={() =>
                  updateMaterials((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" size="sm" asChild>
                <label
                  htmlFor={`ficha-material-arquivo-${index}`}
                  className="cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                >
                  {material.fileName ? t("mat_replace") : t("mat_import")}
                  <input
                    id={`ficha-material-arquivo-${index}`}
                    type="file"
                    accept={materialFileAccept(material.kind)}
                    className="sr-only"
                    onChange={(event) => {
                      void importFile(
                        index,
                        material.kind,
                        event.target.files?.[0],
                      );
                      event.target.value = "";
                    }}
                  />
                </label>
              </Button>
              {material.dataUrl && material.fileName && (
                <a
                  href={material.dataUrl}
                  download={material.fileName}
                  className="text-micro font-bold text-link"
                >
                  {t("mat_open")}
                </a>
              )}
              <MaterialStatus material={material} className="min-w-40 flex-1" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-micro font-bold tracking-[0.04em] uppercase text-fg-subtle">
                {t("mat_or_link")}
              </span>
              <Input
                type="url"
                aria-label={t("mat_link_ph")}
                placeholder={t("mat_link_ph")}
                spellCheck={false}
                className="min-w-45 flex-1"
                value={material.link ?? ""}
                onChange={(event) =>
                  patchMaterial(index, { link: event.target.value })
                }
              />
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
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        block
        onClick={() =>
          updateMaterials((current) => [...current, makeEmptyMaterial()])
        }
      >
        {t("mat_add")}
      </Button>
    </div>
  );
}
