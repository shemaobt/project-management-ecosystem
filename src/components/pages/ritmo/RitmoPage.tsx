import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GLOBAL_SCOPE_LABEL_KEY,
  LISTENING_FLOW,
  RITMO_MEETINGS,
} from "../../../constants/meetings";
import { draftKey, useRhythmStore } from "../../../stores/rhythmStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import { useRegionsStore } from "../../../stores/regionsStore";
import type { MeetingCadence, MeetingDefinition } from "../../../types/meeting";
import {
  formatIsoDate,
  periodKey,
  quarterOf,
  toCalendarDate,
  type CalendarDate,
} from "../../../utils/cadence";
import {
  formatDate,
  formatMonthName,
  toLocalIsoDate,
} from "../../../utils/format";
import {
  meetingReadiness,
  meetingStatus,
  nextOccurrence,
  resolveMeetingParticipants,
  scopesFor,
  type RhythmScope,
} from "../../../utils/rhythm";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Cascade, ListeningFlow } from "./Cascade";
import { LogMeetingDialog } from "./LogMeetingDialog";
import { MeetingCard } from "./MeetingCard";
import { MeetingRow } from "./MeetingRow";

interface Editing {
  meeting: MeetingDefinition;
  scope: RhythmScope;
}

type Translate = ReturnType<typeof useTranslation>["t"];

function periodLabel(
  cadence: MeetingCadence,
  date: CalendarDate,
  t: Translate,
): string {
  if (cadence === "annual") return String(date.year);
  if (cadence === "quarterly") {
    return t("ritmo_period_quarter", {
      quarter: quarterOf(date.month),
      year: date.year,
    });
  }
  return `${formatMonthName(date.year, date.month)} · ${date.year}`;
}

export function RitmoPage() {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrateProjects = useProjectsStore((state) => state.hydrate);
  const regions = useRegionsStore((state) => state.regions);
  const hydrateRegions = useRegionsStore((state) => state.hydrate);
  const log = useRhythmStore((state) => state.log);
  const drafts = useRhythmStore((state) => state.drafts);
  const hydrateRhythm = useRhythmStore((state) => state.hydrate);
  const setDraft = useRhythmStore((state) => state.setDraft);
  const logMeeting = useRhythmStore((state) => state.logMeeting);
  const undoMeeting = useRhythmStore((state) => state.undoMeeting);

  const [editing, setEditing] = useState<Editing | null>(null);

  useEffect(() => {
    void hydrateProjects();
    void hydrateRegions();
    void hydrateRhythm();
  }, [hydrateProjects, hydrateRegions, hydrateRhythm]);

  const todayIso = toLocalIsoDate();
  const today = toCalendarDate(new Date(`${todayIso}T00:00:00`));

  const agenda = useMemo(() => {
    const now = new Date(`${todayIso}T00:00:00`);
    const reference = toCalendarDate(now);
    return RITMO_MEETINGS.map((meeting) => ({
      meeting,
      rows: scopesFor(meeting, projects, GLOBAL_SCOPE_LABEL_KEY).map((scope) => {
        const status = meetingStatus(log, meeting, scope.key, now);
        return {
          scope,
          status,
          nextDue: formatDate(
            formatIsoDate(nextOccurrence(meeting, status, now)),
          ),
          periodLabel: periodLabel(meeting.cadence, reference, t),
          readiness: meeting.readiness
            ? meetingReadiness(
                meeting.readiness,
                meeting.cadence,
                projects,
                scope.key,
                now,
              )
            : null,
          participants: resolveMeetingParticipants(meeting, scope.key, regions),
        };
      }),
    }));
  }, [todayIso, projects, log, regions, t]);

  const editingKey = editing
    ? draftKey(editing.meeting.id, editing.scope.key)
    : "";
  const draft = drafts[editingKey] ?? { date: todayIso, notes: "" };

  return (
    <section className="mx-auto max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-7">
        <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
          {t("ritmo_eyebrow")}
        </p>
        <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
          {t("ritmo_title")}
        </h1>
        <p className="max-w-[64ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
          {t("ritmo_lead")}
        </p>
      </header>

      <Cascade meetings={RITMO_MEETINGS} />
      <ListeningFlow tiers={LISTENING_FLOW} />

      <h2 className="mb-2.5 text-eyebrow font-semibold tracking-eyebrow uppercase text-fg-muted">
        {t("ritmo_meetings_title")}
      </h2>

      {!hydrated ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : null}

      {hydrated
        ? agenda.map(({ meeting, rows }) => (
            <MeetingCard key={meeting.id} meeting={meeting}>
              {rows.length === 0 ? (
                <p className="text-micro leading-[1.45] text-fg-subtle">
                  {t("ritmo_no_projects")}
                </p>
              ) : (
                rows.map((row) => (
                  <MeetingRow
                    key={row.scope.key}
                    scope={row.scope}
                    status={row.status}
                    nextDue={row.nextDue}
                    periodLabel={row.periodLabel}
                    readiness={row.readiness}
                    participants={row.participants}
                    onLog={() => setEditing({ meeting, scope: row.scope })}
                    onUndo={() =>
                      undoMeeting(
                        meeting.id,
                        row.scope.key,
                        periodKey(meeting.cadence, today),
                      )
                    }
                  />
                ))
              )}
            </MeetingCard>
          ))
        : null}

      {editing ? (
        <LogMeetingDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          meetingTitle={t(editing.meeting.titleKey)}
          scopeLabel={t(editing.scope.labelKey)}
          draft={draft}
          onDraftChange={(next) => setDraft(editingKey, next)}
          onSave={() => {
            logMeeting(
              editing.meeting.id,
              editing.scope.key,
              editing.meeting.cadence,
              draft,
            );
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
