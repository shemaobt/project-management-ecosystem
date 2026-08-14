import { useTranslation } from "react-i18next";
import type { EtenYearReport, EtenYearSnapshot } from "../../../types/eten";
import { cn } from "../../../utils/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../ui";

const NUM = "text-right tabular-nums";

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
        <span className="ml-1.5 text-tag font-semibold text-fg-muted">
          {t("eten_source_manual")}
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
    <Table>
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
                {snapshot.languageName}
              </span>
              {snapshot.country ? (
                <span className="mt-0.5 block text-tag text-fg-subtle">
                  {snapshot.country}
                </span>
              ) : null}
            </TableCell>
            <TableCell className={NUM}>{snapshot.scopeUnits || "—"}</TableCell>
            <TableCell className={NUM}>
              {snapshot.hasData ? snapshot.approvedAtStart : "—"}
            </TableCell>
            <TableCell className={NUM}>
              {snapshot.hasData ? snapshot.approvedAtEnd : "—"}
            </TableCell>
            <TableCell className={cn(NUM, "font-semibold text-fg")}>
              {snapshot.hasData ? `+${snapshot.advanced}` : "—"}
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
