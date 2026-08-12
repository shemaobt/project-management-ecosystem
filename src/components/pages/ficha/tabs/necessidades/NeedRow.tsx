import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  NEED_CATEGORIES,
  NEED_STATUSES,
  NEED_STATUS_LABEL_KEYS,
  NEED_URGENCIES,
  NEED_URGENCY_LABEL_KEYS,
} from "../../../../../constants/project";
import type {
  NeedCategory,
  NeedItem,
  NeedStatus,
  NeedUrgency,
} from "../../../../../types/project";
import {
  CheckboxField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "../../../../ui";
import { Field, FieldGrid } from "../../fields";

export interface NeedRowProps {
  need: NeedItem;
  index: number;
  onChange: (patch: Partial<NeedItem>) => void;
  onRemove: () => void;
}

export function NeedRow({ need, index, onChange, onRemove }: NeedRowProps) {
  const { t } = useTranslation();
  const id = `need-${index}`;

  return (
    <li className="rounded-[12px] border border-line bg-elevated p-4">
      <div className="flex flex-wrap items-end gap-2.5">
        <Field id={`${id}-cat`} label={t("sb_needs_section")}>
          {(control) => (
            <Select
              value={need.category}
              onValueChange={(next) =>
                onChange({ category: next as NeedCategory })
              }
            >
              <SelectTrigger {...control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEED_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {t(category.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field
          id={`${id}-urgency`}
          label={t("need_urgency_label")}
          hint={t("need_urgency_hint")}
        >
          {(control) => (
            <Select
              value={need.urgency}
              onValueChange={(next) =>
                onChange({ urgency: next as NeedUrgency })
              }
            >
              <SelectTrigger {...control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEED_URGENCIES.map((urgency) => (
                  <SelectItem key={urgency} value={urgency}>
                    {t(NEED_URGENCY_LABEL_KEYS[urgency])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field
          id={`${id}-status`}
          label={t("need_status_label")}
          hint={
            need.status === "dropped" ? t("need_status_dropped_hint") : undefined
          }
        >
          {(control) => (
            <Select
              value={need.status}
              onValueChange={(next) => onChange({ status: next as NeedStatus })}
            >
              <SelectTrigger {...control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEED_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(NEED_STATUS_LABEL_KEYS[status])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <button
          type="button"
          aria-label={t("need_remove")}
          onClick={onRemove}
          className="mb-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-pill text-fg-muted transition-colors duration-fast ease-out hover:bg-accent-soft hover:text-telha"
        >
          <X size={15} strokeWidth={2.25} />
        </button>
      </div>

      <div className="mt-3">
        <Field id={`${id}-desc`} label={t("need_description")} full>
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              value={need.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="mt-3">
        <FieldGrid>
          <Field id={`${id}-value`} label={t("need_estimated_value")}>
            {(control) => (
              <Input
                {...control}
                value={need.estimatedValue ?? ""}
                autoComplete="off"
                onChange={(event) =>
                  onChange({ estimatedValue: event.target.value })
                }
              />
            )}
          </Field>

          <Field id={`${id}-deadline`} label={t("need_deadline")}>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={need.deadline ?? ""}
                onChange={(event) => onChange({ deadline: event.target.value })}
              />
            )}
          </Field>

          {need.status === "fulfilled" && (
            <>
              <Field id={`${id}-by`} label={t("need_fulfilled_by")}>
                {(control) => (
                  <Input
                    {...control}
                    value={need.fulfilledBy ?? ""}
                    autoComplete="off"
                    onChange={(event) =>
                      onChange({ fulfilledBy: event.target.value })
                    }
                  />
                )}
              </Field>
              <Field id={`${id}-when`} label={t("need_fulfilled_date")}>
                {(control) => (
                  <Input
                    {...control}
                    type="date"
                    value={need.fulfilledDate ?? ""}
                    onChange={(event) =>
                      onChange({ fulfilledDate: event.target.value })
                    }
                  />
                )}
              </Field>
            </>
          )}

          {need.status === "dropped" && (
            <Field id={`${id}-dropped`} label={t("need_dropped_date")}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={need.fulfilledDate ?? ""}
                  onChange={(event) =>
                    onChange({ fulfilledDate: event.target.value })
                  }
                />
              )}
            </Field>
          )}
        </FieldGrid>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-line pt-3">
        <CheckboxField
          id={`${id}-shared`}
          label={t("need_prayer_shared")}
          checked={Boolean(need.prayerShared)}
          onCheckedChange={(next) => onChange({ prayerShared: next === true })}
        />
        <CheckboxField
          id={`${id}-answered`}
          label={t("need_prayer_answered")}
          checked={Boolean(need.prayerAnswered)}
          onCheckedChange={(next) => onChange({ prayerAnswered: next === true })}
        />
      </div>
    </li>
  );
}
