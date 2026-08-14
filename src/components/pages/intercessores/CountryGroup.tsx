import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { circleControl, transitionColors } from "../../../styles";
import type { Intercessor } from "../../../types/prayer";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import {
  contactChannel,
  type CountryGroup as Group,
} from "../../../utils/intercessors";
import { RemoveRowButton } from "../../common/RemoveRowButton";

const CHANNEL_KEYS = { phone: "int_channel_phone", email: "int_channel_email" };

export interface IntercessorRowProps {
  person: Intercessor;
  onEdit: () => void;
  onRemove: () => void;
}

export function IntercessorRow({
  person,
  onEdit,
  onRemove,
}: IntercessorRowProps) {
  const { t } = useTranslation();
  const channel = contactChannel(person.contact);

  return (
    <li className="flex items-center gap-3.5 rounded-md border border-line bg-elevated px-4 py-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-telha text-[16px] leading-none font-black text-on-brand"
      >
        {person.name.slice(0, 1).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-bold wrap-anywhere text-fg-strong">
          {person.name}
        </p>
        <p className="mt-0.5 text-small leading-[1.3] wrap-anywhere text-fg-subtle">
          {channel ? (
            <span className="font-semibold text-fg-muted">
              {t(CHANNEL_KEYS[channel])} ·{" "}
            </span>
          ) : null}
          {person.contact}
        </p>
        <p className="mt-0.5 text-tag text-fg-subtle">
          {t("int_added_on")} {formatDate(person.addedAt)}
        </p>
      </div>

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
    </li>
  );
}

export interface CountryGroupProps {
  group: Group;
  onEdit: (person: Intercessor) => void;
  onRemove: (person: Intercessor) => void;
}

export function CountryGroup({ group, onEdit, onRemove }: CountryGroupProps) {
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
            onEdit={() => onEdit(person)}
            onRemove={() => onRemove(person)}
          />
        ))}
      </ul>
    </section>
  );
}
