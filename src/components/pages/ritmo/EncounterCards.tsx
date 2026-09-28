import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MEETING_CADENCE_LABEL_KEYS } from "../../../constants/meetings";
import { surfaceOutlined } from "../../../styles";
import type { MeetingCadence, MeetingIcon, MeetingReadinessCount } from "../../../types/meeting";
import { cn } from "../../../utils/cn";
import type { RhythmScope } from "../../../utils/rhythm";
import { MEETING_ICONS } from "./meetingIcons";

interface EncounterFrameProps {
  icon: MeetingIcon;
  titleKey: string;
  descriptionKey: string;
  cadence: MeetingCadence;
  children?: ReactNode;
}

/**
 * The frame of an encounter that is **not** a meeting — GATE-02's Monthly Pulse and annual
 * Celebration. Same head as `MeetingCard`, so the five read as one rhythm, and no *Registrar
 * reunião*: nothing here goes to the meeting log, and the server refuses both ids there.
 */
function EncounterFrame({
  icon,
  titleKey,
  descriptionKey,
  cadence,
  children,
}: EncounterFrameProps) {
  const { t } = useTranslation();
  const Icon = MEETING_ICONS[icon];

  return (
    <section className={cn("mb-4.5 rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <div className="flex gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-fg-muted">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-3">
            <h2 className="text-h4 leading-tight font-black text-fg-strong">
              {t(titleKey)}
            </h2>
            <span className="rounded-pill bg-inverse px-2.75 py-1.25 text-[10px] font-bold tracking-[0.1em] uppercase text-on-dark">
              {t(MEETING_CADENCE_LABEL_KEYS[cadence])}
            </span>
          </div>

          <p className="text-small leading-normal text-fg-muted">{t(descriptionKey)}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

export interface PulseReadinessRow {
  scope: RhythmScope;
  readiness: MeetingReadinessCount | null;
}

/**
 * Who sent the Monthly Pulse back, per region — the same `meetingReadiness("pulso", …)` the
 * Forms hub reads, over the same received submissions, so the two screens cannot disagree about
 * the same team (`forms.test.ts` pins it).
 */
export interface PulseCardProps {
  rows: readonly PulseReadinessRow[];
  /**
   * Whether the received Pulses were read. An unread archive is **not** an empty one: a count
   * of `0/N` would say *nobody sent it back* when the truth is *we do not know yet* (PR #62
   * review), so the rows carry no count and a sentence says why.
   */
  read: boolean;
}

export function PulseCard({ rows, read }: PulseCardProps) {
  const { t } = useTranslation();

  return (
    <EncounterFrame
      icon="pulse"
      titleKey="ritmo_pulso_title"
      descriptionKey="ritmo_pulso_desc"
      cadence="monthly"
    >
      {!read ? (
        <p className="mt-4.5 border-t border-line pt-4 text-micro leading-[1.45] text-fg-muted">
          {t("ritmo_pulso_unread")}
        </p>
      ) : rows.length > 0 ? (
        <ul className="mt-4.5 flex list-none flex-col gap-1.5 border-t border-line pt-4">
          {rows.map(({ scope, readiness }) => (
            <li
              key={scope.key}
              className="flex flex-wrap items-center justify-between gap-3 text-micro"
            >
              <span className="font-bold tracking-[0.03em] uppercase text-fg-strong">
                {t(scope.labelKey)}
              </span>
              {readiness ? (
                <span className="text-tag font-semibold text-verde-claro-ink">
                  {readiness.ready}/{readiness.total} {t("ritmo_reported")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-micro leading-[1.45] text-fg-muted">
        <Link to="/formularios" className="font-semibold text-telha underline-offset-2 hover:underline">
          {t("ritmo_pulso_where")}
        </Link>
      </p>
    </EncounterFrame>
  );
}

/** The Celebration's way into the annual report (FE-50, OBT-533). */
export function CelebrationCard() {
  const { t } = useTranslation();

  return (
    <EncounterFrame
      icon="spark"
      titleKey="ritmo_celebracao_title"
      descriptionKey="ritmo_celebracao_desc"
      cadence="annual"
    >
      <p className="mt-3 text-micro leading-[1.45] text-fg-muted">
        <Link
          to="/ritmo/relatorio"
          className="font-semibold text-telha underline-offset-2 hover:underline"
        >
          {t("ritmo_celebracao_open")}
        </Link>
      </p>
    </EncounterFrame>
  );
}
