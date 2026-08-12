import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NeedItem, NeedStatus } from "../../../../../types/project";
import {
  addNeed,
  openNeeds,
  removeNeedAt,
  setNeedAt,
  setNeedStatus,
} from "../../../../../utils/needs";
import { Button, Textarea } from "../../../../ui";
import { Field } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { NeedRow } from "./NeedRow";

export interface NecessidadesFormProps {
  draft: DraftHandle;
}

export function NecessidadesForm({ draft }: NecessidadesFormProps) {
  const { t } = useTranslation();
  const needs = draft.values.needsItems ?? [];
  const open = openNeeds(needs).length;

  const write = (next: NeedItem[]) => draft.set("needsItems", next);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-micro leading-[1.5] text-fg-subtle">
        {t("needs_lead")}
      </p>

      {needs.length === 0 ? (
        <p className="rounded-[12px] border border-line-strong bg-muted px-4 py-3.5 text-micro leading-[1.5] text-fg">
          {t("needs_empty")}
        </p>
      ) : (
        <>
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
            {t("needs_open_count", { count: open })}
          </span>
          <ul className="flex flex-col gap-3">
            {needs.map((need, index) => (
              <NeedRow
                key={index}
                need={need}
                index={index}
                onChange={(patch) => write(setNeedAt(needs, index, patch))}
                onStatus={(status: NeedStatus) =>
                  write(setNeedStatus(needs, index, status))
                }
                onRemove={() => write(removeNeedAt(needs, index))}
              />
            ))}
          </ul>
        </>
      )}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => write(addNeed(needs))}
        >
          <Plus size={14} strokeWidth={2.25} />
          {t("need_add_item")}
        </Button>
      </div>

      <Field id="needs-notes" label={t("f_needs_notes")} full>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={draft.values.needsNotes ?? ""}
            onChange={(event) => draft.set("needsNotes", event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}
