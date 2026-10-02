import { useTranslation } from "react-i18next";
import type { EtenYearReport, EtenYearSnapshot } from "../../../types/eten";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../ui";
import { locationLabel, manualLabel, readingLabel } from "./evidence";
import { getLanguageNameDisplay } from "../../../utils/region";

const NUM = "text-right tabular-nums";
const EVIDENCE = "mt-0.5 block text-tag font-normal text-fg-subtle";

function Credits({ snapshot }: { snapshot: EtenYearSnapshot }) {
  const { t } = useTranslation();

  if (snapshot.undatedCompletion) {
    return (
      <span className="font-semibold text-status-attention-fg" title={t("eten_undated_note")}>
        {t("eten_undated")}
      </span>
    );
  }
  if (snapshot.credits === null) {
    return <span className="text-fg-subtle italic">{t("eten_no_data")}</span>;
  }
  return (
    <span
      className={cn(
        "font-black",
        snapshot.credits > 0 ? "text-telha" : "text-fg-subtle",
      )}
    >
      {snapshot.credits}
      {snapshot.creditsSource === "manual" ? (
        <span className={EVIDENCE}>{manualLabel(snapshot, t)}</span>
      ) : snapshot.completionSource === "completedDate" && snapshot.completedDate ? (
        <span className={EVIDENCE}>
          {t("eten_completed_on", { date: formatDate(snapshot.completedDate) })}
        </span>
      ) : null}
    </span>
  );
}

export interface CreditTableProps {
  report: EtenYearReport;
}

export function CreditTable({ report }: CreditTableProps) {
  const { t } = useTranslation();

  return (
    <Table label={t("eten_table_label")}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("eten_col_project")}</TableHeaderCell>
          <TableHeaderCell className={NUM}>{t("eten_col_scope")}</TableHeaderCell>
          <TableHeaderCell className={NUM}>{t("eten_col_start")}</TableHeaderCell>
          <TableHeaderCell className={NUM}>{t("eten_col_end")}</TableHeaderCell>
          <TableHeaderCell className={NUM}>
            {t("eten_col_advanced")}
          </TableHeaderCell>
          <TableHeaderCell className={NUM}>
            {t("eten_col_credits")}
          </TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {report.snapshots.map((snapshot) => (
          <TableRow
            key={snapshot.projectId}
            className={snapshot.hasData ? undefined : "opacity-70"}
          >
            <TableCell>
              <span className="font-semibold wrap-anywhere text-fg-strong">
                {getLanguageNameDisplay(snapshot, t)}
              </span>
              <span className="mt-0.5 block text-tag text-fg-subtle">
                {locationLabel(snapshot.country, t)}
              </span>
              {snapshot.approvedUnverified ? (
                <span
                  className="mt-0.5 block text-tag font-semibold text-status-attention-fg"
                  title={t("eten_unverified_note")}
                >
                  {t("eten_unverified")}
                </span>
              ) : null}
            </TableCell>
            <TableCell className={NUM}>{snapshot.scopeUnits || "—"}</TableCell>
            <TableCell className={NUM}>
              {snapshot.hasData ? (
                <>
                  {snapshot.approvedAtStart}
                  <span className={EVIDENCE}>
                    {readingLabel(snapshot.startReading, t)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className={NUM}>
              {snapshot.hasData ? (
                <>
                  {snapshot.approvedAtEnd}
                  <span className={EVIDENCE}>
                    {readingLabel(snapshot.endReading, t)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell
              className={cn(
                NUM,
                "font-semibold",
                snapshot.advanced < 0 ? "text-telha" : "text-fg",
              )}
            >
              {snapshot.hasData
                ? `${snapshot.advanced < 0 ? "−" : "+"}${Math.abs(snapshot.advanced)}`
                : "—"}
            </TableCell>
            <TableCell className={NUM}>
              <Credits snapshot={snapshot} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      <TableFoot>
        <TableRow>
          <TableCell colSpan={5}>{t("eten_total")}</TableCell>
          <TableCell className={NUM}>
            {report.hasData ? report.totalCredits : "—"}
          </TableCell>
        </TableRow>
      </TableFoot>
    </Table>
  );
}
