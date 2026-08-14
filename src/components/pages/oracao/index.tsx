import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import { cn } from "../../../utils/cn";
import {
  buildPrayerRequests,
  countPrayerIndicators,
  groupPrayerRequests,
} from "../../../utils/prayer";
import { EmptyState } from "../../common/EmptyState";
import {
  ALL_CONTINENTS,
  ContinentFilter,
  type ContinentFilterValue,
} from "./ContinentFilter";
import { Indicators } from "./Indicators";
import { RequestCard } from "./RequestCard";

const subtab =
  "rounded-pill px-5 py-2.75 text-[13px] leading-none font-bold tracking-[0.02em] text-fg-muted";

const subtabOn = "bg-canvas text-telha shadow-sm";

export interface OracaoViewProps {
  projects: readonly Project[] | null;
  initialContinent?: ContinentFilterValue;
}

export function OracaoView({
  projects,
  initialContinent = ALL_CONTINENTS,
}: OracaoViewProps) {
  const { t } = useTranslation();
  const [continent, setContinent] = useState(initialContinent);

  const requests = useMemo(
    () => buildPrayerRequests(projects ?? []),
    [projects],
  );
  const groups = useMemo(() => groupPrayerRequests(requests), [requests]);
  const indicators =
    projects === null ? null : countPrayerIndicators(requests);
  const active = groups.some((group) => group.region === continent)
    ? continent
    : ALL_CONTINENTS;
  const visibleGroups =
    active === ALL_CONTINENTS
      ? groups
      : groups.filter((group) => group.region === active);

  return (
    <section className="mx-auto w-full max-w-[1080px] px-(--container-pad) pt-8 pb-20">
      <header className="mb-5.5">
        <p className="mb-2.5 text-[12px] leading-none font-bold tracking-[0.16em] text-telha uppercase">
          {t("oracao_eyebrow")}
        </p>
        <h1 className="mb-3 text-[34px] leading-[1.08] font-extrabold tracking-[-0.01em] text-fg-strong">
          {t("oracao_title")}
        </h1>
        <p className="max-w-[70ch] font-serif text-[15px] leading-[1.6] text-fg-muted italic">
          {t("oracao_lead")}
        </p>
      </header>

      <nav
        aria-label={t("oracao_subnav_label")}
        className="mb-5.5 inline-flex gap-1 rounded-pill bg-muted p-1"
      >
        <NavLink
          to="/oracao"
          end
          className={({ isActive }) => cn(subtab, isActive && subtabOn)}
        >
          {t("oracao_sub_mural")}
        </NavLink>
        <NavLink
          to="/oracao/intercessores"
          className={({ isActive }) => cn(subtab, isActive && subtabOn)}
        >
          {t("oracao_sub_rede")}
        </NavLink>
      </nav>

      <Indicators indicators={indicators} />

      <ContinentFilter
        groups={groups}
        total={requests.length}
        value={active}
        onChange={setContinent}
      />

      {projects !== null &&
        (visibleGroups.length === 0 ? (
          <EmptyState message={t("oracao_empty")} />
        ) : (
          visibleGroups.map((group) => (
            <section key={group.region} className="mb-8">
              <h2 className="mb-3.5 text-eyebrow text-fg-muted uppercase">
                {t(group.labelKey)}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
                {group.requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </section>
          ))
        ))}
    </section>
  );
}

export function OracaoPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <OracaoView projects={hydrated ? projects : null} />;
}
