import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { etenAPI } from "../../../fixtures";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { EtenCreditEntry } from "../../../types/eten";
import type { Project } from "../../../types/project";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { CreditTable } from "./CreditTable";
import { Indicators } from "./Indicators";
import {
  buildEtenReport,
  defaultReportYear,
  reportYears,
} from "../../../utils/etenCredits";
import { YearSelector } from "./YearSelector";

export interface EtenViewProps {
  projects: readonly Project[] | null;
  ledger?: readonly EtenCreditEntry[];
  now?: Date;
}

export function EtenView({
  projects,
  ledger = [],
  now = new Date(),
}: EtenViewProps) {
  const { t } = useTranslation();
  const years = useMemo(() => reportYears(now), [now]);
  const [year, setYear] = useState(() => defaultReportYear(now));

  const report = useMemo(
    () => buildEtenReport(projects ?? [], year, ledger, now),
    [projects, ledger, year, now],
  );

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
            {t("eten_eyebrow")}
          </p>
          <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
            {t("eten_title")}
          </h1>
          <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
            {t("eten_lead")}
          </p>
        </div>
        <YearSelector years={years} value={year} onChange={setYear} />
      </header>

      {projects === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <>
          <Indicators report={report} />

          {report.listedProjects === 0 ? (
            <EmptyState message={t("eten_empty")} />
          ) : (
            <>
              {report.hasData ? null : (
                <p className="mb-3.5 rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
                  {t("eten_year_no_data", { year })}
                </p>
              )}
              <CreditTable report={report} />
            </>
          )}

          <div className="mt-4.5 flex flex-col gap-1.5 text-micro leading-normal text-fg-subtle">
            <p className="max-w-[80ch]">{t("eten_footnote")}</p>
            <p className="max-w-[80ch]">{t("eten_carryover_open")}</p>
            <p className="max-w-[80ch]">{t("eten_rule_pending")}</p>
            <p className="max-w-[80ch]">{t("eten_export_pending")}</p>
          </div>
        </>
      )}
    </section>
  );
}

export function EtenPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const [ledger, setLedger] = useState<readonly EtenCreditEntry[]>([]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void etenAPI.credits().then(setLedger);
  }, []);

  return <EtenView projects={hydrated ? projects : null} ledger={ledger} />;
}
