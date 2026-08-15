import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SaveOutcome } from "../../../types/team";

const DESTINATIONS = [
  "equipe_appears_sidebar",
  "equipe_appears_ritmo",
  "equipe_appears_ficha",
];

export interface SaveSummaryProps {
  outcome: SaveOutcome;
}

export function SaveSummary({ outcome }: SaveSummaryProps) {
  const { t } = useTranslation();

  if (outcome.changed === 0) {
    return (
      <p className="rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
        {t("equipe_nothing_changed")}
      </p>
    );
  }

  return (
    <section className="rounded-md border border-status-good-line bg-status-good-bg px-4 py-3.5">
      <p className="flex items-center gap-2 text-small font-semibold text-verde-claro-ink">
        <Check size={15} strokeWidth={2} aria-hidden />
        {t("equipe_saved_changed", { count: outcome.changed })}
      </p>
      <p className="mt-2 text-tag font-bold tracking-button uppercase text-fg-muted">
        {t("equipe_appears_in")}
      </p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {DESTINATIONS.map((key) => (
          <li key={key} className="text-small leading-normal text-fg">
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}
