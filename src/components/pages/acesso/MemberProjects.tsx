import { useTranslation } from "react-i18next";
import type { AccountProject } from "../../../types/access";
import { getLanguageNameDisplay } from "../../../utils/region";
import { Button } from "../../ui";
import type { RoleRefusal } from "./PersonPanel";
import { RefusalNote } from "./RefusalNote";
import { memberRow } from "./rows";

export interface MemberProjectsProps {
  person: string;
  projects: readonly AccountProject[];
  acting: string | null;
  refusal: RoleRefusal | null;
  onRemove: (project: AccountProject) => void;
}

/** Pure, so the static render the suite has sees every state (OBT-679). */
export function MemberProjects({
  person,
  projects,
  acting,
  refusal,
  onRemove,
}: MemberProjectsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted px-4 py-3.5">
      <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
        {t("acesso_member_of_title")}
      </p>
      {projects.length === 0 ? (
        <p className="text-small text-fg-muted">{t("acesso_member_of_none", { person })}</p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((project) => {
            const row = memberRow(project.id);
            return (
              <li key={project.id} className="flex flex-col gap-2 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="min-w-0 text-small font-semibold wrap-anywhere text-fg">
                    {getLanguageNameDisplay(project, t)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={acting !== null}
                    onClick={() => onRemove(project)}
                  >
                    {acting === row ? t("acesso_saving") : t("acesso_member_remove")}
                  </Button>
                </div>
                {refusal?.row === row ? <RefusalNote failure={refusal.failure} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
