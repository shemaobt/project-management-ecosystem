import { Bookmark, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SavedView } from "../../../../stores/savedViewsStore";
import { MAX_VIEW_NAME } from "../../../../stores/savedViewsStore";
import { transitionColors } from "../../../../styles";
import { cn } from "../../../../utils/cn";
import { Button, Input } from "../../../ui";
import type { UnavailableFilter } from "./availability";
import { FILTER_LABEL_KEYS } from "./availability";

export interface SavedViewRowProps {
  view: SavedView;
  missing: readonly UnavailableFilter[];
  onApply: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

export function SavedViewRow({
  view,
  missing,
  onApply,
  onRename,
  onRemove,
}: SavedViewRowProps) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(view.name);

  const cancelRename = () => {
    setDraft(view.name);
    setRenaming(false);
  };

  if (renaming) {
    return (
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onRename(draft);
          setRenaming(false);
        }}
      >
        <Input
          autoFocus
          value={draft}
          maxLength={MAX_VIEW_NAME}
          aria-label={t("sb_view_rename", { name: view.name })}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelRename();
          }}
          className="py-1.5 text-micro"
        />
        <div className="flex gap-1.5">
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            {t("sb_save_view_confirm")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancelRename}>
            {t("sb_save_view_cancel")}
          </Button>
        </div>
      </form>
    );
  }

  const staleFilters = missing
    .map(({ key }) => t(FILTER_LABEL_KEYS[key]))
    .join(", ");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 overflow-hidden rounded-[10px] border border-line bg-elevated hover:border-line-strong">
        <button
          type="button"
          onClick={onApply}
          aria-label={t("sb_view_apply", { name: view.name })}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-micro font-semibold text-fg",
            transitionColors,
            "hover:bg-accent-soft hover:text-telha",
          )}
        >
          <Bookmark size={13} strokeWidth={1.75} className="shrink-0 text-telha" />
          <span className="truncate">{view.name}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(view.name);
            setRenaming(true);
          }}
          aria-label={t("sb_view_rename", { name: view.name })}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center border-l border-line text-fg-subtle",
            transitionColors,
            "hover:bg-accent-soft hover:text-telha",
          )}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("sb_view_delete", { name: view.name })}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center border-l border-line text-fg-subtle",
            transitionColors,
            "hover:bg-accent-soft hover:text-telha",
          )}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
      {missing.length > 0 && (
        <p className="px-3 pt-1 text-[10px] font-semibold text-status-attention-fg">
          {t("sb_view_stale_hint", { filters: staleFilters })}
        </p>
      )}
    </div>
  );
}
