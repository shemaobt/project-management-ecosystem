import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../../types/project";
import { cardSummary, openableCardProps } from "./card";

export interface OpenableCardProps {
  project: Project;
  onOpen: () => void;
  className: string;
  children: ReactNode;
}

/**
 * The one way a project card becomes a button. `role="button"` has presentational children, so
 * the summary cannot live inside the card: it is a sibling, outside the button, tied to it by
 * `aria-describedby` — the reader hears the short name, then the summary, and still reaches the
 * summary as text in browse mode.
 */
export function OpenableCard({
  project,
  onOpen,
  className,
  children,
}: OpenableCardProps) {
  const { t } = useTranslation();
  const summaryId = useId();
  return (
    <>
      <article
        {...openableCardProps({
          label: t("card_open", { language: project.languageName }),
          describedBy: summaryId,
          onOpen,
        })}
        className={className}
      >
        {children}
      </article>
      <p id={summaryId} className="sr-only">
        {cardSummary(project, t)}
      </p>
    </>
  );
}
