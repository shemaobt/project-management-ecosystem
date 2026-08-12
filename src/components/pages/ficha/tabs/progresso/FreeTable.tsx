import { useTranslation } from "react-i18next";
import type {
  OtherProgressItem,
  StoryProgressItem,
  StoryRecordStatus,
} from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import {
  Button,
  CheckboxField,
  Input,
  Select,
  SelectContent,
  SelectItem,
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
  clampChapters,
  emptyOtherRow,
  emptyStoryRow,
  patchRow,
  removeRow,
} from "./sections";

const STORY_GRID =
  "grid grid-cols-[minmax(0,1.8fr)_130px_28px] items-center gap-1.5 px-2.5 py-2";

const RECORD_STATUSES: readonly {
  value: StoryRecordStatus;
  labelKey: string;
}[] = [
  { value: "planned", labelKey: "story_st_planned" },
  { value: "recording", labelKey: "story_st_recording" },
  { value: "recorded", labelKey: "story_st_recorded" },
];

function AddRowFooter({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="border-t border-line bg-muted p-2.5">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        onClick={onAdd}
      >
        {label}
      </Button>
    </div>
  );
}

export interface StoryTableProps {
  rows: readonly StoryProgressItem[];
  onChange: (rows: StoryProgressItem[]) => void;
}

export function StoryTable({ rows, onChange }: StoryTableProps) {
  const { t } = useTranslation();

  const patch = (index: number, patchValue: Partial<StoryProgressItem>) =>
    onChange(patchRow(rows, index, patchValue));

  return (
    <div className={TABLE_FRAME}>
      <div className={cn(STORY_GRID, "border-b border-line bg-muted")}>
        <span className={TABLE_HEAD_CELL}>{t("col_story")}</span>
        <span className={cn(TABLE_HEAD_CELL, "text-center")}>
          {t("story_audio_hours")}
        </span>
        <span />
      </div>

      {rows.map((row, index) => (
        <div key={index} className="border-b border-line last:border-b-0">
          <div className={STORY_GRID}>
            <Input
              aria-label={t("col_story")}
              placeholder={t("col_story")}
              value={row.name}
              onChange={(event) => patch(index, { name: event.target.value })}
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              aria-label={t("story_audio_hours")}
              placeholder="0"
              className="px-1.5 py-1.5 text-center tabular-nums"
              value={row.audioHours ?? ""}
              onChange={(event) =>
                patch(index, {
                  audioHours:
                    event.target.value === ""
                      ? ""
                      : Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
            <RemoveRowButton
              label={`${t("row_remove")} · ${row.name || t("col_story")}`}
              onClick={() => onChange(removeRow(rows, index))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2.5">
            <Input
              className="min-w-55 flex-1"
              aria-label={t("story_location_ph")}
              placeholder={t("story_location_ph")}
              value={row.recordLocation ?? ""}
              onChange={(event) =>
                patch(index, { recordLocation: event.target.value })
              }
            />
            <Select
              value={row.recordStatus ?? "planned"}
              onValueChange={(next) => {
                const option = RECORD_STATUSES.find(
                  (entry) => entry.value === next,
                );
                if (option) patch(index, { recordStatus: option.value });
              }}
            >
              <SelectTrigger
                aria-label={t("story_record_status")}
                className="w-45 flex-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECORD_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CheckboxField
              id={`ficha-story-ia-${index}`}
              label={t("story_ai")}
              checked={row.aiAssisted ?? false}
              onCheckedChange={(checked) =>
                patch(index, { aiAssisted: checked === true })
              }
            />
          </div>
        </div>
      ))}

      <AddRowFooter
        label={t("btn_add_story")}
        onAdd={() => onChange([...rows, emptyStoryRow()])}
      />
    </div>
  );
}

export interface OtherTableProps {
  rows: readonly OtherProgressItem[];
  onChange: (rows: OtherProgressItem[]) => void;
}

export function OtherTable({ rows, onChange }: OtherTableProps) {
  const { t } = useTranslation();

  const patch = (index: number, patchValue: Partial<OtherProgressItem>) =>
    onChange(patchRow(rows, index, patchValue));

  return (
    <div className={TABLE_FRAME}>
      <div className={cn(COUNT_GRID, "border-b border-line bg-muted")}>
        <span className={TABLE_HEAD_CELL}>{t("col_unit")}</span>
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
          key={index}
          className={cn(COUNT_GRID, "border-b border-line last:border-b-0")}
        >
          <Input
            aria-label={t("col_unit")}
            placeholder={t("col_unit")}
            value={row.name}
            onChange={(event) => patch(index, { name: event.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            aria-label={t("col_chapters")}
            className="px-1.5 py-1.5 text-center tabular-nums"
            value={row.chapters}
            onChange={(event) =>
              patch(index, { chapters: clampChapters(event.target.value) })
            }
          />
          <CountInput
            label={`${row.name || t("col_unit")} · ${t("col_translated")}`}
            value={row.translated}
            onChange={(value) => patch(index, { translated: value })}
          />
          <CountInput
            label={`${row.name || t("col_unit")} · ${t("col_checked")}`}
            value={row.communityChecked}
            onChange={(value) => patch(index, { communityChecked: value })}
          />
          <CountInput
            label={`${row.name || t("col_unit")} · ${t("col_approved")}`}
            value={row.mentorApproved}
            onChange={(value) => patch(index, { mentorApproved: value })}
          />
          <RemoveRowButton
            label={`${t("row_remove")} · ${row.name || t("col_unit")}`}
            onClick={() => onChange(removeRow(rows, index))}
          />
        </div>
      ))}

      <AddRowFooter
        label={t("btn_add_unit")}
        onAdd={() => onChange([...rows, emptyOtherRow()])}
      />
    </div>
  );
}
