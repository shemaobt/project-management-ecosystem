import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { etenAPI, failureMessage, toApiFailure } from "../../../services/api";
import type { EtenYearReport } from "../../../types/eten";
import type { ApiFailure } from "../../../types/session";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { CreditBreakdown } from "./CreditBreakdown";
import { CreditTable } from "./CreditTable";
import { Indicators } from "./Indicators";
import { ReportProvenance } from "./ReportProvenance";
import {
  currentFiscalYear,
  defaultReportYear,
  fiscalYearSpan,
  reportYears,
} from "../../../utils/etenCredits";
import { YearSelector } from "./YearSelector";

export interface EtenViewProps {
  year: number;
  onYearChange: (year: number) => void;
  /** The server's answer for `year`; `null` while it is on its way or when it failed. */
  report: EtenYearReport | null;
  /** The failure sentence, when the read failed. */
  error: string | null;
  onRetry: () => void;
  now?: Date;
}

/**
 * The ETEN report as the server answered it (INT-08). The screen computes no figure: in `api`
 * mode `GET /eten/report` owns the rule, and in fixture mode the double answers with the same
 * shape. Pure, so the static render the suite has can see every state (§5.8's seam).
 */
export function EtenView({
  year,
  onYearChange,
  report,
  error,
  onRetry,
  now = new Date(),
}: EtenViewProps) {
  const { t } = useTranslation();
  const years = useMemo(() => reportYears(now), [now]);

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
        <YearSelector
          years={years}
          value={year}
          onChange={onYearChange}
          openYear={currentFiscalYear(now)}
        />
      </header>

      {error ? (
        <EmptyState
          message={error}
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t("net_retry")}
            </Button>
          }
        />
      ) : report === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <>
          <ReportProvenance report={report} />
          <Indicators report={report} />

          {report.listedProjects === 0 ? (
            <EmptyState message={t("eten_empty")} />
          ) : (
            <>
              {report.hasData ? null : (
                <p className="mb-3.5 rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
                  {t("eten_year_no_data", { year: fiscalYearSpan(year) })}
                </p>
              )}
              <CreditTable report={report} />
              {report.hasData ? <CreditBreakdown report={report} /> : null}
            </>
          )}

          <div className="mt-4.5 flex flex-col gap-1.5 text-micro leading-normal text-fg-subtle">
            <p className="max-w-[80ch]">{t("eten_footnote")}</p>
            <p className="max-w-[80ch]">{t("eten_export_pending")}</p>
          </div>
        </>
      )}
    </section>
  );
}

interface Answer {
  year: number;
  attempt: number;
  report: EtenYearReport | null;
  failure: ApiFailure | null;
}

/**
 * One request per year chosen and per retry. An answer is shown only for the year and the
 * attempt it was asked for, so a slow reply for the year left behind never lands under the
 * label of the year on screen — a figure that goes to a funder under the wrong year is the
 * failure this screen exists to prevent. The failure is kept raw and worded at render.
 */
export function EtenPage() {
  const { t } = useTranslation();
  const [now] = useState(() => new Date());
  const [year, setYear] = useState(() => defaultReportYear(now));
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    let cancelled = false;
    etenAPI
      .report(year)
      .then((report) => {
        if (!cancelled) setAnswer({ year, attempt, report, failure: null });
      })
      .catch((raw: unknown) => {
        if (!cancelled) {
          setAnswer({ year, attempt, report: null, failure: toApiFailure(raw) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year, attempt]);

  const current =
    answer && answer.year === year && answer.attempt === attempt ? answer : null;

  return (
    <EtenView
      year={year}
      onYearChange={setYear}
      report={current?.report ?? null}
      error={current?.failure ? failureMessage(current.failure, t) : null}
      onRetry={() => setAttempt((count) => count + 1)}
      now={now}
    />
  );
}
