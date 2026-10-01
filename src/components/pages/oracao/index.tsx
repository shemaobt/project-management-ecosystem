import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ROLE_DEFINITIONS } from "../../../constants/roles";
import { useAuth } from "../../../contexts/AuthContext";
import {
  failureMessage,
  prayerAPI,
  prayerPulseAPI,
  resolveSource,
  toApiFailure,
} from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { PrayerRequest } from "../../../types/prayer";
import type { ApiFailure } from "../../../types/session";
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
import { PulseButton } from "./PulseButton";
import { RequestCard } from "./RequestCard";
import { SubNav } from "./SubNav";

/**
 * The wall as it stands for this reader — one union, so a view can never be handed a list
 * *and* a failure at once. The failure is kept raw and worded at render by `failureMessage`,
 * the single owner of that reading: a 403 on this wall is a scope answer, never "try again".
 */
export type WallLoad =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly requests: readonly PrayerRequest[] }
  | { readonly status: "failed"; readonly failure: ApiFailure };

export interface OracaoViewProps {
  /** Never built here from whole projects against the server (INT-06). */
  wall: WallLoad;
  /** The Pulse control, when the reader may generate one (INT-06). */
  pulse?: ReactNode;
  initialContinent?: ContinentFilterValue;
}

export function OracaoView({
  wall,
  pulse,
  initialContinent = ALL_CONTINENTS,
}: OracaoViewProps) {
  const { t } = useTranslation();
  const [continent, setContinent] = useState(initialContinent);

  const served = wall.status === "ready" ? wall.requests : null;
  const requests = useMemo(() => served ?? [], [served]);
  const groups = useMemo(() => groupPrayerRequests(requests), [requests]);
  const indicators =
    served === null ? null : countPrayerIndicators(requests);
  const active = groups.some((group) => group.region === continent)
    ? continent
    : ALL_CONTINENTS;
  const visibleGroups =
    active === ALL_CONTINENTS
      ? groups
      : groups.filter((group) => group.region === active);

  return (
    <section className="mx-auto w-full max-w-(--container-mural) px-(--container-pad) pt-8 pb-20">
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
        <p className="mt-2 max-w-[70ch] text-small font-semibold text-fg">
          {t("oracao_authorized_only")}
        </p>
        {pulse !== undefined && served !== null && requests.length > 0 && (
          <div className="mt-4">{pulse}</div>
        )}
      </header>

      <SubNav />

      <Indicators indicators={indicators} />

      {wall.status === "failed" && (
        <EmptyState message={failureMessage(wall.failure, t)} />
      )}

      {served !== null && (
        <>
          <ContinentFilter
            groups={groups}
            total={requests.length}
            value={active}
            onChange={setContinent}
          />

          {visibleGroups.length === 0 ? (
            <EmptyState message={t("oracao_empty")} />
          ) : (
            visibleGroups.map((group) => (
              <section key={group.region} className="mb-8">
                <h2 className="mb-3.5 text-eyebrow text-fg-muted uppercase">
                  {t(group.labelKey)}
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3.5">
                  {group.requests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}

/**
 * **Against the server the wall is the server's** (INT-06 · OBT-411). `GET /prayer/requests`
 * answers only what the teams authorized for the network, inside the reader's scope, with
 * sensitive countries already transformed — so nothing unauthorized is ever fetched to this
 * page, and the wall is held in this component's state and nowhere else: no store, nothing
 * persisted. Until INT-06 the page built the wall from the whole projects in `projectsStore`
 * and filtered here, which is the hidden-but-present the issue forbids.
 *
 * In fixture mode the derivation from `projectsStore` stays, for §5.5's reason: it is what
 * makes a consent withdrawn in the ficha leave the wall on the next render.
 */
export function OracaoPage() {
  const live = resolveSource("prayer") === "api";
  return live ? <LiveOracaoPage /> : <FixtureOracaoPage />;
}

function LiveOracaoPage() {
  const { user } = useAuth();
  const [wall, setWall] = useState<WallLoad>({ status: "loading" });
  const sendsPulse = user.roles.includes(ROLE_DEFINITIONS.resourceCircle.key);

  useEffect(() => {
    let current = true;
    prayerAPI.list().then(
      (requests) => {
        if (current) setWall({ status: "ready", requests });
      },
      (raw: unknown) => {
        if (current) setWall({ status: "failed", failure: toApiFailure(raw) });
      },
    );
    return () => {
      current = false;
    };
  }, []);

  return (
    <OracaoView
      wall={wall}
      pulse={
        sendsPulse && prayerPulseAPI !== null && wall.status === "ready" ? (
          <PulseButton api={prayerPulseAPI} count={wall.requests.length} />
        ) : undefined
      }
    />
  );
}

function FixtureOracaoPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const wall = useMemo<WallLoad>(
    () =>
      hydrated
        ? { status: "ready", requests: buildPrayerRequests(projects) }
        : { status: "loading" },
    [hydrated, projects],
  );
  return <OracaoView wall={wall} />;
}
