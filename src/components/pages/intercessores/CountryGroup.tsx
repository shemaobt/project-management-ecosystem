import { Mail, Pencil, Phone, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { circleControl, transitionColors } from "../../../styles";
import type { IntercessorEntry } from "../../../types/prayer";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { type CountryGroup as Group } from "../../../utils/intercessors";
import { RemoveRowButton } from "../../common/RemoveRowButton";
import { Badge, Button } from "../../ui";

const CHANNEL_KEYS = { phone: "int_channel_phone", email: "int_channel_email" };
const ACTION_KEYS = { phone: "int_call", email: "int_message" };

export interface IntercessorRowProps {
  person: IntercessorEntry;
  contacting: boolean;
  reviewing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onContact: () => void;
  onReview: () => void;
}

/**
 * One person. When the server says their year has passed (`reviewDue`, OBT-531) the row
 * carries the question and its two answers — "Revisado" keeps them and starts the year
 * again, "Remover" opens the same confirmation the × does. The flag is read, never computed.
 */
export function IntercessorRow({
  person,
  contacting,
  reviewing,
  onEdit,
  onRemove,
  onContact,
  onReview,
}: IntercessorRowProps) {
  const { t } = useTranslation();
  const channel = person.contactChannel;
  const ActionIcon = channel === "email" ? Mail : Phone;

  return (
    <li
      className={cn(
        "rounded-md border bg-elevated px-4 py-3",
        person.reviewDue ? "border-line-strong" : "border-line",
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-telha text-[16px] leading-none font-black text-on-brand"
        >
          {person.name.slice(0, 1).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] leading-snug font-bold wrap-anywhere text-fg-strong">
            {person.name}
            {person.sensitiveCountry ? (
              <span
                className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-press"
                title={t("f_sensitive")}
              >
                <ShieldAlert size={11} strokeWidth={2} aria-hidden />
                {t("f_sensitive")}
              </span>
            ) : null}
            {person.reviewDue ? (
              <Badge tone="accent" size="sm">
                {t("int_review_due_badge")}
              </Badge>
            ) : null}
          </p>
          <p className="mt-0.5 text-small leading-[1.3] wrap-anywhere text-fg-subtle">
            {channel ? (
              <span className="font-semibold text-fg-muted">
                {t(CHANNEL_KEYS[channel])} ·{" "}
              </span>
            ) : null}
            {person.contactHint || t("int_contact_unreachable")}
          </p>
          <p className="mt-0.5 text-tag text-fg-subtle">
            {t("int_added_on")} {formatDate(person.addedAt)}
            {person.reviewedAt ? (
              <>
                {" · "}
                {t("int_reviewed_on")} {formatDate(person.reviewedAt)}
              </>
            ) : null}
          </p>
        </div>

        {channel ? (
          <button
            type="button"
            aria-label={t(ACTION_KEYS[channel])}
            title={t(ACTION_KEYS[channel])}
            disabled={contacting}
            onClick={onContact}
            className={cn(
              circleControl,
              transitionColors,
              "size-6.5 flex-none text-fg-muted hover:bg-accent-soft hover:text-telha disabled:opacity-50",
            )}
          >
            <ActionIcon size={14} strokeWidth={1.75} />
          </button>
        ) : null}

        <button
          type="button"
          aria-label={t("int_edit")}
          title={t("int_edit")}
          onClick={onEdit}
          className={cn(
            circleControl,
            transitionColors,
            "size-6.5 flex-none text-fg-muted hover:bg-accent-soft hover:text-telha",
          )}
        >
          <Pencil size={14} strokeWidth={1.75} />
        </button>

        <RemoveRowButton label={t("int_remove")} onClick={onRemove} />
      </div>

      {person.reviewDue ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <p className="min-w-0 flex-1 basis-60 text-small leading-snug text-fg">
            {t("int_review_due_hint")}
          </p>
          <Button
            variant="green"
            size="sm"
            disabled={reviewing}
            onClick={onReview}
          >
            {t("int_review_done")}
          </Button>
          <Button variant="danger" size="sm" onClick={onRemove}>
            {t("int_review_remove")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export interface CountryGroupProps {
  group: Group;
  contactingId: string | null;
  reviewingId: string | null;
  onEdit: (person: IntercessorEntry) => void;
  onRemove: (person: IntercessorEntry) => void;
  onContact: (person: IntercessorEntry) => void;
  onReview: (person: IntercessorEntry) => void;
}

export function CountryGroup({
  group,
  contactingId,
  reviewingId,
  onEdit,
  onRemove,
  onContact,
  onReview,
}: CountryGroupProps) {
  return (
    <section className="mb-4.5">
      <h2 className="mb-2.5 flex items-center gap-2 text-tag leading-none font-bold tracking-[0.14em] uppercase text-fg-subtle">
        {group.name}
        <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-bold text-fg-muted">
          {group.people.length}
        </span>
      </h2>
      <ul className="flex list-none flex-col gap-2">
        {group.people.map((person) => (
          <IntercessorRow
            key={person.id}
            person={person}
            contacting={contactingId === person.id}
            reviewing={reviewingId === person.id}
            onEdit={() => onEdit(person)}
            onRemove={() => onRemove(person)}
            onContact={() => onContact(person)}
            onReview={() => onReview(person)}
          />
        ))}
      </ul>
    </section>
  );
}
