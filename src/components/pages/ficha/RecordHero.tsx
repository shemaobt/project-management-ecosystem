import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { DialogTitle } from "../../ui";
import type { RecordMode } from "./types";
import type { DraftHandle } from "./useDraft";

const TITLE_TEXT = "text-[32px] leading-[1.05] font-extrabold tracking-[-0.01em]";

export interface RecordHeroProps {
  mode: RecordMode;
  draft: DraftHandle;
}

export function RecordHero({ mode, draft }: RecordHeroProps) {
  const { t } = useTranslation();
  const name = draft.values.languageName ?? "";
  const eyebrow = draft.isNew
    ? t("modal_new")
    : mode === "editar"
      ? t("modal_edit")
      : t("d_record");

  return (
    <div className="relative overflow-hidden bg-verde px-8 pt-7 pb-6 text-on-dark">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-30 size-70 rounded-pill bg-telha opacity-16"
      />
      <div className="relative z-1 flex items-start justify-between gap-4 pr-10">
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-areia">
            {eyebrow}
          </div>
          {mode === "editar" ? (
            <>
              <DialogTitle className="sr-only">
                {name || t("modal_new")}
              </DialogTitle>
              <input
                value={name}
                onChange={(event) =>
                  draft.set("languageName", event.target.value)
                }
                placeholder={t("placeholder_lang")}
                aria-label={t("f_lang_name")}
                className={cn(
                  TITLE_TEXT,
                  "w-full border-b border-branco/25 bg-transparent pb-1 text-on-dark",
                  "placeholder:text-on-dark/40 focus:border-branco/60",
                )}
              />
            </>
          ) : (
            <DialogTitle className={cn(TITLE_TEXT, "truncate text-on-dark")}>
              {name || "—"}
            </DialogTitle>
          )}
        </div>
      </div>
    </div>
  );
}
