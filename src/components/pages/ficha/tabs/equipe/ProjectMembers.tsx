import { AlertTriangle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { failureMessage, membersAPI, toApiFailure } from "../../../../../services/api";
import type { ProjectMember } from "../../../../../types/project";
import type { ApiFailure } from "../../../../../types/session";
import { formatDate } from "../../../../../utils/format";
import { LoadingSpinner } from "../../../../common/LoadingSpinner";

export interface MembersPanelProps {
  /** `null` while the roster is on its way. */
  members: readonly ProjectMember[] | null;
  /** The failure sentence, when the read failed. */
  error: string | null;
  hint?: string;
}

/**
 * The project's members — BE-18 (OBT-524) — read-only, with the day each one joined.
 *
 * Pure, so the static render the suite has can see every state: `renderToStaticMarkup` runs no
 * effect, which is §5.8's reason for the presentational seam. **No control of any kind**: who
 * joins and who leaves is the Admin's, on the access screen (OBT-546). The members are accounts
 * linked to the project on the server; the free-text people above stay the record's own, and
 * nothing here writes them.
 */
export function MembersPanel({ members, error, hint }: MembersPanelProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  return (
    <section className="rounded-[12px] border border-line bg-muted px-4 py-3.5">
      <h3 className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
        <Users size={14} strokeWidth={1.75} aria-hidden />
        {t("f_members_title")}
      </h3>

      {error ? (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-1.5 text-micro font-semibold text-accent-press"
        >
          <AlertTriangle size={14} strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : members === null ? (
        <div className="mt-3">
          <LoadingSpinner size="sm" label={t("loading")} />
        </div>
      ) : members.length === 0 ? (
        <p className="mt-3 text-micro text-fg-subtle">{t("f_members_empty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-[10px] border border-line bg-elevated px-3.5 py-2.5"
            >
              <span className="text-[13px] font-semibold wrap-anywhere text-fg">
                {member.name}
              </span>
              <span className="text-micro text-fg-muted">
                {t("f_members_since", { date: formatDate(member.addedAt, locale) })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-micro leading-[1.45] text-fg-subtle">
        {hint ?? t("f_members_hint")}
      </p>
    </section>
  );
}

export interface ProjectMembersProps {
  projectId: string;
}

/**
 * Reads the roster once per mount. `EquipeTab` owns it above the ver/editar switch and keys it by
 * `projectId`, so toggling the mode keeps it mounted and moving to another record remounts it with
 * a fresh `null` — no reset inside the effect, which `react-hooks/set-state-in-effect` refuses.
 * The failure is kept raw and worded at render, so switching the language rewords it without
 * reading the roster again.
 */
export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<readonly ProjectMember[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    membersAPI
      .list(projectId)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <MembersPanel members={members} error={failure ? failureMessage(failure, t) : null} />
  );
}
