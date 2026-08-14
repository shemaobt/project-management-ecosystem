import { useTranslation } from "react-i18next";
import {
  MEETING_ATTENDEE_LABEL_KEYS,
  MEETING_CADENCE_LABEL_KEYS,
  type ListeningTier,
} from "../../../constants/meetings";
import type { MeetingDefinition } from "../../../types/meeting";

export interface CascadeProps {
  meetings: readonly MeetingDefinition[];
}

export function Cascade({ meetings }: CascadeProps) {
  const { t } = useTranslation();

  return (
    <ol className="mb-9 flex list-none flex-wrap gap-2 rounded-md bg-muted p-4">
      {meetings.map((meeting, index) => (
        <li
          key={meeting.id}
          className="flex min-w-0 flex-auto items-center gap-2 rounded-pill border border-line bg-elevated px-3.5 py-2"
        >
          <span className="text-tag font-black text-telha">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-micro leading-snug font-semibold text-fg-strong">
            {t(meeting.titleKey)}
          </span>
          <span className="ml-auto shrink-0 text-[10px] font-semibold tracking-[0.06em] uppercase text-fg-muted">
            {t(MEETING_CADENCE_LABEL_KEYS[meeting.cadence])}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface ListeningFlowProps {
  tiers: readonly ListeningTier[];
}

export function ListeningFlow({ tiers }: ListeningFlowProps) {
  const { t } = useTranslation();

  return (
    <section className="mb-9">
      <h2 className="mb-2.5 text-eyebrow font-semibold tracking-eyebrow uppercase text-fg-muted">
        {t("ritmo_flow_title")}
      </h2>

      <ol className="grid list-none grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {tiers.map((tier) => (
          <li
            key={tier.key}
            className="bg-elevated px-3 py-3.5 text-center"
          >
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-telha">
              {t(tier.levelKey)}
            </p>
            <p className="mb-1 text-micro leading-snug font-bold text-fg-strong">
              {tier.attendees.map((who) => t(MEETING_ATTENDEE_LABEL_KEYS[who])).join(" + ")}
            </p>
            <p className="text-[10px] leading-[1.3] text-fg-muted">
              {t(tier.whatKey)}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-center font-serif text-micro leading-[1.4] italic text-fg-subtle">
        {t("ritmo_flow_note")}
      </p>
    </section>
  );
}
