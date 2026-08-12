import { useTranslation } from "react-i18next";
import { BIBLE_BOOKS } from "../../../../../constants/bible";
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
import {
  COUNT_GRID,
  CountInput,
  RemoveRowButton,
  TABLE_FRAME,
  TABLE_HEAD_CELL,
} from "./controls";
import { addBookRow, patchRow, removeRow } from "./sections";

export interface BookTableProps {
  rows: readonly BookProgressItem[];
  onChange: (rows: BookProgressItem[]) => void;
}

export function BookTable({ rows, onChange }: BookTableProps) {
  const { t } = useTranslation();
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

      {rows.map((row, index) => (
        <div
          key={row.id}
          className={cn(COUNT_GRID, "border-b border-line last:border-b-0")}
        >
          <span
            className="truncate text-small font-medium text-fg"
            title={row.name}
          >
            {row.name}
          </span>
          <span className="text-center text-small font-semibold tabular-nums text-fg-muted">
            {row.chapters}
          </span>
          <CountInput
            label={`${row.name} · ${t("col_translated")}`}
            value={row.translated}
            max={row.chapters}
            onChange={(value) =>
              onChange(patchRow(rows, index, { translated: value }))
            }
          />
          <CountInput
            label={`${row.name} · ${t("col_checked")}`}
            value={row.communityChecked}
            max={row.chapters}
            onChange={(value) =>
              onChange(patchRow(rows, index, { communityChecked: value }))
            }
          />
          <CountInput
            label={`${row.name} · ${t("col_approved")}`}
            value={row.mentorApproved}
            max={row.chapters}
            onChange={(value) =>
              onChange(patchRow(rows, index, { mentorApproved: value }))
            }
          />
          <RemoveRowButton
            label={`${t("row_remove")} · ${row.name}`}
            onClick={() => onChange(removeRow(rows, index))}
          />
        </div>
      ))}

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
                    {`${book.name} (${book.chapters})`}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("proj_nt")}</SelectLabel>
              {available
                .filter((book) => !book.ot)
                .map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {`${book.name} (${book.chapters})`}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
