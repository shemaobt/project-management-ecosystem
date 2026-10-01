import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GLOBAL_SCOPE_LABEL_KEY,
  LISTENING_FLOW,
  RITMO_ENCOUNTERS,
  RITMO_MEETINGS,
} from "../../../constants/meetings";
import { useAuth } from "../../../contexts/session";
import { useFormsStore } from "../../../stores/formsStore";
import { draftKey, useRhythmStore } from "../../../stores/rhythmStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import { useRegionsStore } from "../../../stores/regionsStore";
import type { MeetingCadence, MeetingDefinition } from "../../../types/meeting";
import {
  formatIsoDate,
  periodKey,
  periodNumber,
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
  rhythmScopes,
  scopesFor,
} from "../../../utils/rhythm";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { ProjectsUnread } from "../../common/ProjectsUnread";
import { Cascade, ListeningFlow } from "./Cascade";
import { CelebrationCard, PulseCard } from "./EncounterCards";
import { LogMeetingDialog } from "./LogMeetingDialog";
import { LogUnread, type LogReading } from "./LogUnread";
import { MeetingCard } from "./MeetingCard";
import { MeetingRow } from "./MeetingRow";
import { withinReach, type RegionScope } from "./reach";

interface Editing {
  meeting: MeetingDefinition;
  scope: RegionScope;
}

type Translate = ReturnType<typeof useTranslation>["t"];

function periodLabel(
  cadence: MeetingCadence,
  date: CalendarDate,
  t: Translate,
): string {
  if (cadence === "annual") return String(date.year);
  if (cadence === "monthly") {
    return `${formatMonthName(date.year, date.month)} · ${date.year}`;
  }
  const n = periodNumber(cadence, date.month);
  if (cadence === "quarterly") {
    return t("ritmo_period_quarter", { quarter: n, year: date.year });
  }
  if (cadence === "bimonthly") {
    return t("ritmo_period_bimester", { n, year: date.year });
  }
  return t("ritmo_period_semester", { n, year: date.year });
}

export function RitmoPage() {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrateProjects = useProjectsStore((state) => state.hydrate);
  const projectsFailure = useProjectsStore((state) => state.error);
  const reloadProjects = useProjectsStore((state) => state.reload);
  const regions = useRegionsStore((state) => state.regions);
  const hydrateRegions = useRegionsStore((state) => state.hydrate);
  const regionsRead = useRegionsStore((state) => state.hydrated);
  const { canSeeRegion } = useAuth();
  const log = useRhythmStore((state) => state.log);
  const logRead = useRhythmStore((state) => state.hydrated);
  const logFailed = useRhythmStore((state) => state.error !== null);
  const logForbidden = useRhythmStore((state) => state.forbidden);
  const drafts = useRhythmStore((state) => state.drafts);
  const reloadRhythm = useRhythmStore((state) => state.reload);
  const setDraft = useRhythmStore((state) => state.setDraft);
  const logMeeting = useRhythmStore((state) => state.logMeeting);
  const undoMeeting = useRhythmStore((state) => state.undoMeeting);
  const submissions = useFormsStore((state) => state.submissions);
  const hydrateForms = useFormsStore((state) => state.hydrate);
  const pulsesRead = useFormsStore((state) => state.hydrated);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void hydrateProjects();
    void hydrateRegions();
    void reloadRhythm();
    void hydrateForms();
  }, [hydrateProjects, hydrateRegions, reloadRhythm, hydrateForms]);

  const todayIso = toLocalIsoDate();
  const logReading: LogReading | null = logForbidden
    ? "forbidden"
    : logRead
      ? null
      : logFailed
        ? "failed"
        : "loading";

  const agenda = useMemo(() => {
    const now = new Date(`${todayIso}T00:00:00`);
    const reference = toCalendarDate(now);
    return RITMO_MEETINGS.map((meeting) => ({
      meeting,
      rows: withinReach(
        scopesFor(meeting, projects, GLOBAL_SCOPE_LABEL_KEY),
        canSeeRegion,
      ).map((scope) => {
        const status = meetingStatus(log, meeting, scope.key, now);
        return {
          scope,
          status,
          period: periodKey(meeting.cadence, reference),
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
                submissions,
                now,
              )
            : null,
          participants: resolveMeetingParticipants(meeting, scope.key, regions),
        };
      }),
    }));
  }, [todayIso, projects, log, regions, submissions, t, canSeeRegion]);

  const pulseRows = useMemo(() => {
    const now = new Date(`${todayIso}T00:00:00`);
    return withinReach(rhythmScopes(projects), canSeeRegion).map((scope) => ({
      scope,
      readiness: meetingReadiness("pulso", "monthly", projects, scope.key, submissions, now),
    }));
  }, [todayIso, projects, submissions, canSeeRegion]);

  const editingKey = editing
    ? draftKey(editing.meeting.id, editing.scope.key)
    : "";
  const draft = drafts[editingKey] ?? { date: todayIso, notes: "" };

  const saveEditing = async ({ meeting, scope }: Editing) => {
    setSaving(true);
    const outcome = await logMeeting(meeting.id, scope.key, draft);
    setSaving(false);
    if (outcome.status === "saved") setEditing(null);
  };

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

      <Cascade encounters={RITMO_ENCOUNTERS} />
      <ListeningFlow tiers={LISTENING_FLOW} />

      <h2 className="mb-2.5 text-eyebrow font-semibold tracking-eyebrow uppercase text-fg-muted">
        {t("ritmo_meetings_title")}
      </h2>

      {!hydrated && projectsFailure ? (
        <ProjectsUnread
          failure={projectsFailure}
          onRetry={() => void reloadProjects()}
        />
      ) : !hydrated ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : null}

      {hydrated ? <PulseCard rows={pulseRows} read={pulsesRead} /> : null}

      {hydrated && logReading ? (
        <LogUnread reading={logReading} onRetry={() => void reloadRhythm()} />
      ) : null}

      {hydrated
        ? agenda.map(({ meeting, rows }) => (
            <MeetingCard key={meeting.id} meeting={meeting}>
              {logReading ? null : rows.length === 0 ? (
                <p className="text-micro leading-[1.45] text-fg-subtle">
                  {t(
                    projects.length === 0
                      ? "ritmo_no_projects"
                      : regionsRead
                        ? "ritmo_no_projects_reach"
                        : "loading",
                  )}
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
                      void undoMeeting(meeting.id, row.scope.key, row.period)
                    }
                  />
                ))
              )}
            </MeetingCard>
          ))
        : null}

      {hydrated ? <CelebrationCard /> : null}

      {editing ? (
        <LogMeetingDialog
          open
          onOpenChange={(open) => {
            if (!open && !saving) setEditing(null);
          }}
          meetingTitle={t(editing.meeting.titleKey)}
          scopeLabel={t(editing.scope.labelKey)}
          draft={draft}
          saving={saving}
          onDraftChange={(next) => setDraft(editingKey, next)}
          onSave={() => void saveEditing(editing)}
        />
      ) : null}
    </section>
  );
}
