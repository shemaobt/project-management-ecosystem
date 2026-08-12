import { useTranslation } from "react-i18next";
import { splitPeople } from "../../../../../utils/people";
import { DetailItem, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { RegionalRoles } from "./RegionalRoles";
import { SensitiveContacts } from "./SensitiveContacts";

function PeopleList({ value }: { value: string | undefined }) {
  const people = splitPeople(value);
  if (people.length === 0) return <>—</>;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {people.map((person, index) => (
        <li
          key={`${person}-${index}`}
          className="rounded-pill border border-line bg-elevated px-3 py-1 text-[13px] font-medium not-italic"
        >
          {person}
        </li>
      ))}
    </ul>
  );
}

export interface EquipeViewProps {
  draft: DraftHandle;
}

export function EquipeView({ draft }: EquipeViewProps) {
  const { t } = useTranslation();
  const values = draft.values;

  return (
    <div className="flex flex-col gap-5">
      <FieldGrid>
        <DetailItem label={t("d_facilitators")} full>
          {values.team || "—"}
        </DetailItem>

        <DetailItem label={t("d_leader")}>{values.teamLeader || "—"}</DetailItem>

        <DetailItem label={t("f_leader_contact")}>
          <span className="font-mono text-[13px]">
            {values.teamLeaderContact || "—"}
          </span>
        </DetailItem>

        <DetailItem label={t("d_mentor")}>{values.mentor || "—"}</DetailItem>

        <DetailItem label={t("f_mentor_contact")}>
          <span className="font-mono text-[13px]">
            {values.mentorContact || "—"}
          </span>
        </DetailItem>

        <DetailItem label={t("d_team_contact")}>
          {values.teamContact || "—"}
        </DetailItem>

        <DetailItem label={t("d_partner")}>{values.partnerOrg || "—"}</DetailItem>

        <DetailItem label={t("d_translators")} full serif>
          <PeopleList value={values.translators} />
        </DetailItem>

        <DetailItem label={t("d_reviewers")} full serif>
          <PeopleList value={values.technicalReviewers} />
        </DetailItem>
      </FieldGrid>

      {values.sensitiveCountry && <SensitiveContacts />}

      <RegionalRoles location={values.location ?? ""} />
    </div>
  );
}
