import { useTranslation } from "react-i18next";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";

export interface EmptyResultsProps {
  /** Whether a filter or the search is narrowing the list — the sidebar's `ClearAll` guard. */
  narrowed: boolean;
  search: string;
  onClear: () => void;
}

/**
 * The list with nothing to show, and **why** (OBT-665, PME-PRJ-099). The prototype's empty state
 * has no button (`app.jsx:1108-1111`); the port added *Limpar tudo* to it, and drew it even when
 * nothing was narrowing the list — an account whose regions hold no project read *Ajuste os
 * filtros* and a clear that cleared nothing. So the action, and the advice to adjust, come only
 * with a filter or a search, as the sidebar's own *Limpar tudo* does; without one, the sentence
 * says the regions the account follows have no project.
 */
export function EmptyResults({ narrowed, search, onClear }: EmptyResultsProps) {
  const { t } = useTranslation();
  const term = search.trim();

  if (!narrowed) {
    return <EmptyState title={t("empty_title")} message={t("empty_scope_sub")} />;
  }
  return (
    <EmptyState
      title={t("empty_title")}
      message={term ? t("empty_search_sub", { term }) : t("empty_sub")}
      action={
        <Button variant="secondary" size="sm" onClick={onClear}>
          {t("sb_clear_all")}
        </Button>
      }
    />
  );
}
