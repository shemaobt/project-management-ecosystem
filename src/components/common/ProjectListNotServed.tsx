import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

export interface ProjectListNotServedProps {
  className?: string;
}

/**
 * Said where a screen reads the whole project list and this build does not serve it
 * (INT-12 · OBT-417): the server answers that list nowhere yet, and the fixture one — real people
 * in real places — is withheld from every server build. An empty list there would read as
 * *there are no projects*, which is the claim-without-data the console never makes.
 */
export function ProjectListNotServed({ className }: ProjectListNotServedProps) {
  const { t } = useTranslation();

  return (
    <p
      role="status"
      className={cn(
        "rounded-md border-l-4 border-line-strong bg-muted px-4 py-3 text-small leading-[1.45] text-fg",
        className,
      )}
    >
      {t("projects_not_served")}
    </p>
  );
}
