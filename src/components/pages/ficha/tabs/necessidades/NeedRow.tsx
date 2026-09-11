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
import type { RecordFieldError } from "../../../../../types/projectRecord";
import { formatDate } from "../../../../../utils/format";
import {
  daysSinceRaised,
  isUnacknowledged,
  needMoneyError,
} from "../../../../../utils/needs";
import { listCurrencies } from "../../../../../utils/currency";
import {
  Button,
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
  sensitiveCountry: boolean;
  errors: RecordFieldError[];
  onChange: (patch: Partial<NeedItem>) => void;
  onStatus: (status: NeedStatus) => void;
  onRemove: () => void;
}

export function NeedRow({
  need,
  index,
  sensitiveCountry,
  errors,
  onChange,
  onStatus,
  onRemove,
}: NeedRowProps) {
  const { t } = useTranslation();
  const locale = t("locale");
  const id = `need-${index}`;
  const moneyError = needMoneyError(need);
  const serverMessage = errors[0]?.message;
  const willNotify = need.urgency === "high" && need.status === "open";
  const canAcknowledge =
    need.status === "open" && !need.acknowledgedAt && !need.acknowledged;
  const stale = isUnacknowledged(need);

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
              onValueChange={(next) => onStatus(next as NeedStatus)}
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

        {/* A saved need has a history the region is judged by, so a save never deletes
            it — only an id-less draft row, never sent yet, can still be undone locally. */}
        {!need.id && (
          <button
            type="button"
            aria-label={t("need_remove")}
            onClick={onRemove}
            className="mb-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-pill text-fg-muted transition-colors duration-fast ease-out hover:bg-accent-soft hover:text-telha"
          >
            <X size={15} strokeWidth={2.25} />
          </button>
        )}
      </div>

      {willNotify && (
        <p className="mt-2 text-micro leading-[1.5] text-status-attention-fg">
          {t("need_urgent_notifies")}
          {sensitiveCountry && ` ${t("need_urgent_notifies_sensitive")}`}
        </p>
      )}

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

          <Field
            id={`${id}-amount`}
            label={t("need_amount_label")}
            error={moneyError === "amount" ? t("need_currency_needs_amount") : undefined}
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={need.estimatedAmount ?? ""}
                onChange={(event) =>
                  onChange({ estimatedAmount: event.target.value })
                }
              />
            )}
          </Field>

          <Field
            id={`${id}-currency`}
            label={t("need_currency_label")}
            error={moneyError === "currency" ? t("need_amount_needs_currency") : undefined}
          >
            {(control) => (
              <Select
                value={need.estimatedCurrency ?? ""}
                onValueChange={(next) => onChange({ estimatedCurrency: next })}
              >
                <SelectTrigger {...control}>
                  <SelectValue placeholder={t("need_currency_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {listCurrencies(locale).map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} — {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  value={need.droppedDate ?? ""}
                  onChange={(event) =>
                    onChange({ droppedDate: event.target.value })
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

      {serverMessage && (
        <p role="alert" className="mt-3 text-micro font-semibold text-telha">
          {serverMessage}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-dashed border-line pt-3 text-micro text-fg-muted">
        {need.submittedAt && (
          <span>
            {t("need_submitted_at")} {formatDate(need.submittedAt, locale)}
          </span>
        )}

        {need.acknowledgedAt && (
          <span>
            {t("need_acknowledged_line", {
              date: formatDate(need.acknowledgedAt, locale),
              name: need.acknowledgedBy || "—",
            })}
          </span>
        )}

        {!need.acknowledgedAt && need.acknowledged && (
          <span className="text-fg">{t("need_acknowledge_pending")}</span>
        )}

        {stale && (
          <span className="font-semibold text-status-attention-fg">
            {t("need_unacknowledged_badge", { days: daysSinceRaised(need) })}
          </span>
        )}

        {canAcknowledge && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ acknowledged: true })}
          >
            {t("need_acknowledge")}
          </Button>
        )}
      </div>
    </li>
  );
}
