import {
  Activity,
  HandHeart,
  Heart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  MEETING_ATTENDEE_LABEL_KEYS,
  MEETING_CADENCE_LABEL_KEYS,
  MEETING_FEED_LABEL_KEYS,
} from "../../../constants/meetings";
import { surfaceOutlined } from "../../../styles";
import type { MeetingDefinition } from "../../../types/meeting";
import { cn } from "../../../utils/cn";

const MEETING_ICONS: Record<string, LucideIcon> = {
  pulse: Activity,
  prayer: HandHeart,
  heart: Heart,
  users: Users,
  spark: Sparkles,
};

export interface MeetingCardProps {
  meeting: MeetingDefinition;
  children: ReactNode;
}

export function MeetingCard({ meeting, children }: MeetingCardProps) {
  const { t } = useTranslation();
  const Icon = MEETING_ICONS[meeting.icon] ?? Users;

  return (
    <section className={cn("mb-4.5 rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <div className="mb-4.5 flex gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent-soft text-telha">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-3">
            <h2 className="text-h4 leading-tight font-black text-fg-strong">
              {t(meeting.titleKey)}
            </h2>
            <span className="rounded-pill bg-inverse px-2.75 py-1.25 text-[10px] font-bold tracking-[0.1em] uppercase text-on-dark">
              {t(MEETING_CADENCE_LABEL_KEYS[meeting.cadence])}
            </span>
          </div>

          <p className="mb-3 text-small leading-normal text-fg-muted">
            {t(meeting.descriptionKey)}
          </p>

          <ul className="mb-2.5 flex list-none flex-wrap gap-1.5">
            {meeting.roles.map((role) => (
              <li
                key={role}
                className="rounded-pill border border-line bg-muted px-2.75 py-1.25 text-tag leading-none font-semibold text-fg"
              >
                {t(MEETING_ATTENDEE_LABEL_KEYS[role])}
              </li>
            ))}
          </ul>

          <p className="text-micro leading-[1.4] text-fg-subtle">
            <span className="font-bold text-fg-muted">{t("ritmo_feeds")}</span>{" "}
            {t(MEETING_FEED_LABEL_KEYS[meeting.feeds])}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        {children}
      </div>
    </section>
  );
}
