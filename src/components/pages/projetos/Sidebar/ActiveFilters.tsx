import { X } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useFiltersStore,
  type ProjectFilters,
} from "../../../../stores/filtersStore";
import { transitionAll } from "../../../../styles";
import { cn } from "../../../../utils/cn";
import { scheduleFocusRescue } from "../../../../utils/focus";
import type { GatedFacet } from "../../../../utils/gatedFacets";
import type { FacetCounts } from "../../../../utils/search";
import {
  activeFilterChips,
  chipLabel,
  focusIndexAfterRemoval,
} from "./activeChips";
import { buildFilterOptions } from "./Filters/sections";

export interface ActiveFiltersProps {
  baseline: FacetCounts;
  hidden: readonly GatedFacet[];
}

export interface ActiveFiltersViewProps extends ActiveFiltersProps {
  filters: ProjectFilters;
  onRemove: (key: keyof ProjectFilters) => void;
}

interface PendingFocus {
  index: number;
  after: HTMLElement | null;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function firstFocusableAfter(node: Element | null): HTMLElement | null {
  for (
    let sibling = node?.nextElementSibling ?? null;
    sibling;
    sibling = sibling.nextElementSibling
  ) {
    if (sibling instanceof HTMLElement && sibling.matches(FOCUSABLE)) {
      return sibling;
    }
    const inside = sibling.querySelector<HTMLElement>(FOCUSABLE);
    if (inside) return inside;
  }
  return null;
}

export function ActiveFilters(props: ActiveFiltersProps) {
  const filters = useFiltersStore((state) => state.filters);
  const clearFilter = useFiltersStore((state) => state.clearFilter);
  return <ActiveFiltersView {...props} filters={filters} onRemove={clearFilter} />;
}

export function ActiveFiltersView({
  baseline,
  hidden,
  filters,
  onRemove,
}: ActiveFiltersViewProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pending = useRef<PendingFocus | null>(null);
  const options = useMemo(() => buildFilterOptions(baseline), [baseline]);
  const chips = activeFilterChips(filters, options, hidden);

  useLayoutEffect(() => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    const buttons = listRef.current?.querySelectorAll("button");
    const index = focusIndexAfterRemoval(next.index, buttons?.length ?? 0);
    const target = index === null ? next.after : (buttons?.[index] ?? null);
    if (target) target.focus();
    else scheduleFocusRescue();
  });

  if (chips.length === 0) return null;

  return (
    <div ref={stripRef} className="mb-1.5 shadow-accent-soft">
      <div className="mt-4 mb-2 flex items-center justify-between">
        <h2
          id={headingId}
          className="inline-flex items-center gap-1.5 text-[10px] leading-body font-bold tracking-[0.18em] uppercase text-fg-subtle"
        >
          {t("sb_active_filters")}
        </h2>
      </div>
      <ul
        ref={listRef}
        aria-labelledby={headingId}
        className="flex flex-wrap gap-1.5"
      >
        {chips.map((chip, index) => {
          const label = chipLabel(chip, t);
          return (
            <li key={chip.key} className="max-w-full">
              <button
                type="button"
                aria-label={t("sb_active_remove", { filter: label })}
                onClick={() => {
                  pending.current = {
                    index,
                    after:
                      chips.length === 1
                        ? firstFocusableAfter(stripRef.current)
                        : null,
                  };
                  onRemove(chip.key);
                }}
                className={cn(
                  "inline-flex max-w-full cursor-pointer items-center gap-1 rounded-pill bg-brand px-2.5 py-1",
                  "text-left text-tag font-semibold text-on-brand hover:bg-accent-hover",
                  transitionAll,
                )}
              >
                <span className="min-w-0 wrap-anywhere">{label}</span>
                <X
                  size={11}
                  strokeWidth={2}
                  className="ml-0.5 shrink-0"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
