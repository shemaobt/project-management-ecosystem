import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ROLES } from "../../../constants/roles";
import {
  SESSION_ROLE_LABEL_KEYS,
  useAuth,
} from "../../../contexts/AuthContext";
import { useProjectsStore } from "../../../stores/projectsStore";
import { useRegionsStore } from "../../../stores/regionsStore";
import type { Project } from "../../../types/project";
import type { Region, RegionKey, RoleChange } from "../../../types/region";
import type { RoleKey } from "../../../types/role";
import type { SaveOutcome } from "../../../types/team";
import { getRegion } from "../../../utils/region";
import { draftsFor, unassignedCount } from "../../../utils/team";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { Leadership } from "./Leadership";
import { RegionRoles } from "./RegionRoles";
import { SaveSummary } from "./SaveSummary";

const editKey = (regionKey: RegionKey, role: RoleKey) => `${regionKey}:${role}`;

export interface EquipeViewProps {
  regions: readonly Region[] | null;
  projects?: readonly Project[];
  changes?: readonly RoleChange[];
  onSave: (drafts: ReturnType<typeof draftsFor>) => SaveOutcome;
}

export function EquipeView({
  regions,
  projects = [],
  changes = [],
  onSave,
}: EquipeViewProps) {
  const { t } = useTranslation();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);

  const visible = useMemo(() => regions ?? [], [regions]);

  const counts = useMemo(() => {
    const tally = new Map<RegionKey, number>();
    for (const project of projects) {
      const key = getRegion(project);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    return tally;
  }, [projects]);

  const drafts = useMemo(() => {
    const base = draftsFor(visible);
    for (const region of visible) {
      const draft = base[region.key];
      if (!draft) continue;
      for (const role of ROLES) {
        const edited = edits[editKey(region.key, role.key)];
        if (edited !== undefined) draft[role.key] = edited;
      }
    }
    return base;
  }, [visible, edits]);

  const dirty = useMemo(
    () =>
      visible.some((region) => {
        const draft = drafts[region.key];
        return (
          draft !== undefined &&
          ROLES.some(
            (role) =>
              region.team[role.key].trim() !== draft[role.key].trim(),
          )
        );
      }),
    [visible, drafts],
  );

  const pending = unassignedCount(drafts);

  return (
    <section className="mx-auto w-full max-w-(--container-max) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6">
        <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
          {t("equipe_eyebrow")}
        </p>
        <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
          {t("equipe_title")}
        </h1>
        <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
          {t("equipe_lead")}
        </p>
      </header>

      {regions === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState message={t("equipe_no_regions")} />
      ) : (
        <div className="flex flex-col gap-4">
          <Leadership />

          <div>
            <h2 className="mb-1 text-h4 leading-tight font-black tracking-tight text-fg-strong">
              {t("equipe_regions_title")}
            </h2>
            {pending > 0 ? (
              <p className="mb-3.5 text-small leading-normal text-fg-muted">
                {t("equipe_unassigned_count", { count: pending })}{" "}
                {t("equipe_fill_hint")}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((region) => (
                <RegionRoles
                  key={region.key}
                  region={region}
                  count={counts.get(region.key) ?? 0}
                  draft={drafts[region.key] ?? region.team}
                  changes={changes}
                  onChange={(role, holder) => {
                    setOutcome(null);
                    setEdits((current) => ({
                      ...current,
                      [editKey(region.key, role)]: holder,
                    }));
                  }}
                />
              ))}
            </div>
          </div>

          {outcome ? <SaveSummary outcome={outcome} /> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-muted px-5 py-4">
            <p className="text-small leading-normal text-fg-muted">
              {t("equipe_hint")}
            </p>
            <Button
              disabled={!dirty}
              onClick={() => {
                setOutcome(onSave(drafts));
                setEdits({});
              }}
            >
              {t("equipe_save")}
            </Button>
          </div>

          <p className="max-w-[80ch] text-micro leading-normal text-fg-subtle">
            {t("equipe_history_note")}
          </p>
        </div>
      )}
    </section>
  );
}

export function EquipePage() {
  const { user, canSeeRegion } = useAuth();
  const { t } = useTranslation();
  const regions = useRegionsStore((state) => state.regions);
  const changes = useRegionsStore((state) => state.changes);
  const hydrated = useRegionsStore((state) => state.hydrated);
  const hydrateRegions = useRegionsStore((state) => state.hydrate);
  const saveTeams = useRegionsStore((state) => state.saveTeams);
  const projects = useProjectsStore((state) => state.projects);
  const hydrateProjects = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateRegions();
    void hydrateProjects();
  }, [hydrateRegions, hydrateProjects]);

  const visible = useMemo(
    () => regions.filter((region) => canSeeRegion(region.key)),
    [regions, canSeeRegion],
  );

  const changedBy = user.name ?? t(SESSION_ROLE_LABEL_KEYS[user.role]);

  return (
    <EquipeView
      regions={hydrated ? visible : null}
      projects={projects}
      changes={changes}
      onSave={(drafts) => saveTeams(drafts, changedBy)}
    />
  );
}
