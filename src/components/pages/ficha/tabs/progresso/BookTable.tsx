import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BIBLE_BOOKS, bookName, bookNameById } from "../../../../../constants/bible";
import type { BookProgressItem } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../../../ui";
import { RemoveRowButton } from "../../../../common/RemoveRowButton";
import {
  COUNT_GRID,
  CountInput,
  TABLE_FRAME,
  TABLE_HEAD_CELL,
} from "./controls";
import {
  addBookRow,
  removeRow,
  typeBookCount,
  type BookCountField,
  type CappedCount,
} from "./sections";

export interface BookTableProps {
  rows: readonly BookProgressItem[];
  onChange: (rows: BookProgressItem[]) => void;
}

/**
 * What a cut says, in the table's own words (OBT-605): the book and its ceiling, kept on screen
 * until the person types in that field again — never a toast that leaves before it is read.
 * The live region is always mounted and only its text changes, which is what a screen reader
 * announces; a region born together with its text is often missed.
 */
export function CappedNotice({ text }: { text: string | null }) {
  return (
    <div role="status" aria-live="polite">
      {text ? (
        <p className="border-t border-line bg-muted px-2.5 py-2 text-micro font-semibold text-fg">
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function BookTable({ rows, onChange }: BookTableProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [capped, setCapped] = useState<CappedCount | null>(null);

  const typed = (index: number, field: BookCountField) => (raw: string) => {
    const next = typeBookCount(rows, index, field, raw);
    const row = rows[index];
    setCapped((current) =>
      next.capped ??
      (current && current.bookId === row.id && current.field === field ? null : current),
    );
    onChange(next.rows);
  };

  const cappedRow = capped ? rows.find((row) => row.id === capped.bookId) : undefined;
  const used = new Set(rows.map((row) => row.id));
  const available = BIBLE_BOOKS.filter((book) => !used.has(book.id));

  const add = (bookId: string) => {
    const book = BIBLE_BOOKS.find((entry) => entry.id === bookId);
    if (book) onChange(addBookRow(rows, book));
  };

  return (
    <div className={TABLE_FRAME}>
      <div className={cn(COUNT_GRID, "border-b border-line bg-muted")}>
        <span className={TABLE_HEAD_CELL}>{t("col_book")}</span>
        <span className={cn(TABLE_HEAD_CELL, "text-center")}>
          {t("col_chapters")}
        </span>
        <span className={cn(TABLE_HEAD_CELL, "text-center")}>
          {t("col_translated")}
        </span>
        <span className={cn(TABLE_HEAD_CELL, "text-center")}>
          {t("col_checked")}
        </span>
        <span className={cn(TABLE_HEAD_CELL, "text-center")}>
          {t("col_approved")}
        </span>
        <span />
      </div>

      {rows.map((row, index) => {
        const label = bookNameById(row.id, row.name, lang);
        return (
        <div
          key={row.id}
          className={cn(COUNT_GRID, "border-b border-line last:border-b-0")}
        >
          <span
            className="truncate text-small font-medium text-fg"
            title={label}
          >
            {label}
          </span>
          <span className="text-center text-small font-semibold tabular-nums text-fg-muted">
            {row.chapters}
          </span>
          <CountInput
            label={`${label} · ${t("col_translated")}`}
            value={row.translated}
            max={row.chapters}
            onChange={() => undefined}
            onTyped={typed(index, "translated")}
          />
          <CountInput
            label={`${label} · ${t("col_checked")}`}
            value={row.communityChecked}
            max={row.chapters}
            onChange={() => undefined}
            onTyped={typed(index, "communityChecked")}
          />
          <CountInput
            label={`${label} · ${t("col_approved")}`}
            value={row.mentorApproved}
            max={row.chapters}
            onChange={() => undefined}
            onTyped={typed(index, "mentorApproved")}
          />
          <RemoveRowButton
            label={`${t("row_remove")} · ${label}`}
            onClick={() => onChange(removeRow(rows, index))}
          />
        </div>
        );
      })}

      <CappedNotice
        text={
          capped && cappedRow
            ? t("progress_capped", {
                book: bookNameById(cappedRow.id, cappedRow.name, lang),
                max: capped.max,
              })
            : null
        }
      />

      <div className="border-t border-line bg-muted p-2.5">
        <Select value="" onValueChange={add}>
          <SelectTrigger aria-label={t("btn_add_book")}>
            <SelectValue placeholder={t("btn_add_book")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("proj_ot")}</SelectLabel>
              {available
                .filter((book) => book.ot)
                .map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {`${bookName(book, lang)} (${book.chapters})`}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("proj_nt")}</SelectLabel>
              {available
                .filter((book) => !book.ot)
                .map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {`${bookName(book, lang)} (${book.chapters})`}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
