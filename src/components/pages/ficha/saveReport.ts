import { tabOf } from "../../../constants/recordFields";
import { TAB_LABEL_KEYS, type RecordTabId } from "../../../constants/recordTabs";
import type { RecordField } from "../../../types/projectRecord";

type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * What a successful save wrote, and what it kept here — one sentence, in tab names.
 *
 * The second half exists because it is the honest half: the record write does not carry
 * every tab yet, and a coordinator who typed into one of those has to be told the input
 * is still in this browser rather than left to assume it landed.
 */
export function savedSentence(
  written: readonly RecordTabId[],
  withheld: readonly RecordField[],
  t: Translate,
): string {
  const label = (tab: RecordTabId) => t(TAB_LABEL_KEYS[tab]);
  const keptTabs = [
    ...new Set(
      withheld.map(tabOf).filter((tab): tab is RecordTabId => tab !== null),
    ),
  ];
  return [
    written.length > 0
      ? t("record_saved_tabs", { tabs: written.map(label).join(" · ") })
      : null,
    keptTabs.length > 0
      ? t("record_saved_withheld", { tabs: keptTabs.map(label).join(" · ") })
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * What to say when the attempt never left the browser — and never the word *saved*.
 *
 * Two different silences: nothing moved at all, or the only thing somebody typed was a
 * tab the record write does not carry yet. The second one has to name that tab, with
 * the same sentence a real save uses for its withheld half, because the input is in
 * this browser and nowhere else and the modal is about to stay open over it.
 */
export function unchangedSentence(
  withheld: readonly RecordField[],
  t: Translate,
): string {
  const kept = savedSentence([], withheld, t);
  return kept ? `${t("record_nothing_written")} ${kept}` : t("record_no_changes");
}
