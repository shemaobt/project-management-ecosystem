import { useTranslation } from "react-i18next";
import {
  CARD_METAPHORS,
  METAPHOR_LABEL_KEYS,
} from "../../../../constants/metaphors";
import { usePrefsStore } from "../../../../stores/prefsStore";
import { cn } from "../../../../utils/cn";
import { transitionAll } from "../../../../styles";

export function MetaphorPill() {
  const { t } = useTranslation();
  const metaphor = usePrefsStore((state) => state.metaphor);
  const setMetaphor = usePrefsStore((state) => state.setMetaphor);

  return (
    <div
      role="group"
      aria-label={t("tweaks_metaphor")}
      className="inline-flex items-center rounded-pill border border-line bg-muted p-[3px]"
    >
      {CARD_METAPHORS.map((key) => {
        const active = metaphor === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => setMetaphor(key)}
            className={cn(
              "rounded-pill px-3 py-1.5 text-tag font-semibold tracking-[0.08em] uppercase",
              transitionAll,
              active ? "bg-telha text-on-brand" : "text-fg-muted hover:text-fg",
            )}
          >
            {t(METAPHOR_LABEL_KEYS[key])}
          </button>
        );
      })}
    </div>
  );
}
