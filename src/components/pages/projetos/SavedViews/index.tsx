import { Bookmark, Link2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../contexts/AuthContext";
import { useFiltersStore } from "../../../../stores/filtersStore";
import { usePrefsStore } from "../../../../stores/prefsStore";
import {
  MAX_VIEWS_PER_USER,
  selectUserViews,
  useSavedViewsStore,
  type SavedView,
} from "../../../../stores/savedViewsStore";
import type { Project } from "../../../../types/project";
import { cn } from "../../../../utils/cn";
import {
  encodeViewToUrl,
  isEmptyView,
  type ViewState,
} from "../../../../utils/filterSerialisation";
import { transitionColors } from "../../../../styles";
import { toast } from "../../../ui";
import { SavedViewRow } from "./SavedViewRow";
import { SaveViewForm } from "./SaveViewForm";
import {
  applicableState,
  datasetCounts,
  FILTER_LABEL_KEYS,
  findUnavailable,
} from "./availability";

export interface SavedViewsProps {
  projects: readonly Project[];
}

export function SavedViews({ projects }: SavedViewsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [naming, setNaming] = useState(false);

  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const applyState = useFiltersStore((state) => state.applyState);
  const sort = usePrefsStore((state) => state.sort);
  const metaphor = usePrefsStore((state) => state.metaphor);
  const setSort = usePrefsStore((state) => state.setSort);
  const setMetaphor = usePrefsStore((state) => state.setMetaphor);

  const byUser = useSavedViewsStore((state) => state.byUser);
  const saveView = useSavedViewsStore((state) => state.saveView);
  const renameView = useSavedViewsStore((state) => state.renameView);
  const removeView = useSavedViewsStore((state) => state.removeView);

  const views = selectUserViews(byUser, user.id);
  const current: ViewState = { filters, search, sort, metaphor };
  const counts = useMemo(() => datasetCounts(projects), [projects]);

  const applyView = (view: SavedView) => {
    const { state, missing } = applicableState(view.state, counts);
    applyState(state.filters, state.search);
    setSort(state.sort);
    setMetaphor(state.metaphor);
    if (missing.length > 0) {
      toast(
        t("sb_view_partial", {
          filters: missing.map(({ key }) => t(FILTER_LABEL_KEYS[key])).join(", "),
        }),
      );
    }
  };

  const handleSave = (name: string) => {
    const saved = saveView(user.id, name, current);
    setNaming(false);
    toast[saved ? "success" : "error"](
      saved
        ? t("sb_view_saved", { name: saved.name })
        : t("sb_view_limit", { count: MAX_VIEWS_PER_USER }),
    );
  };

  const copyLink = () => {
    const url = encodeViewToUrl(
      current,
      `${window.location.origin}${window.location.pathname}`,
    );
    void navigator.clipboard?.writeText(url);
    toast.success(t("sb_view_link_copied"));
  };

  const savable = !isEmptyView(current);

  return (
    <div className="px-0.5">
      <div className="mt-4 mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-fg-subtle uppercase">
          <Bookmark size={12} strokeWidth={1.75} />
          {t("sb_saved_views")}
        </span>
        {savable && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyLink}
              aria-label={t("sb_view_copy_link")}
              className={cn(
                "inline-flex items-center px-1 py-0.5 text-telha",
                transitionColors,
                "hover:underline",
              )}
            >
              <Link2 size={13} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setNaming(true)}
              className={cn(
                "inline-flex items-center gap-1 px-1 py-0.5 text-tag font-semibold tracking-[0.02em] text-telha",
                transitionColors,
                "hover:underline",
              )}
            >
              <Plus size={13} strokeWidth={1.75} />
              {t("sb_save_view")}
            </button>
          </div>
        )}
      </div>

      {naming && (
        <SaveViewForm onSave={handleSave} onCancel={() => setNaming(false)} />
      )}

      {views.length === 0 ? (
        <p className="mb-2 rounded-[12px] bg-muted px-3.5 py-3 font-serif text-micro leading-[1.45] italic text-fg-muted">
          {t("sb_no_saved_views")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {views.map((view) => (
            <SavedViewRow
              key={view.id}
              view={view}
              missing={findUnavailable(view.state.filters, counts)}
              onApply={() => applyView(view)}
              onRename={(name) => renameView(user.id, view.id, name)}
              onRemove={() => {
                removeView(user.id, view.id);
                toast(t("sb_view_removed", { name: view.name }));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
