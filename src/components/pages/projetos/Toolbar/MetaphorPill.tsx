import { useTranslation } from "react-i18next";
import { usePrefsStore, type CardMetaphor } from "../../../../stores/prefsStore";
import { cn } from "../../../../utils/cn";
import { transitionAll } from "../../../../styles";

const METAPHORS: readonly { key: CardMetaphor; labelKey: string }[] = [
  { key: "atlas", labelKey: "nav_atlas" },
  { key: "diario", labelKey: "nav_diario" },
  { key: "coral", labelKey: "nav_coral" },
];

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
      {METAPHORS.map((option) => {
        const active = metaphor === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => setMetaphor(option.key)}
            className={cn(
              "rounded-pill px-3 py-1.5 text-tag font-semibold tracking-[0.08em] uppercase",
              transitionAll,
              active ? "bg-telha text-branco" : "text-fg-muted hover:text-verde",
            )}
          >
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
