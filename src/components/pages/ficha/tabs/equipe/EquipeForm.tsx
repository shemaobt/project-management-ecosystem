import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../ui";
import { Field, FieldGrid } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { PeopleField } from "./PeopleField";
import { RegionalRoles } from "./RegionalRoles";
import { SensitiveContacts } from "./SensitiveContacts";

export interface EquipeFormProps {
  draft: DraftHandle;
}

export function EquipeForm({ draft }: EquipeFormProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const values = draft.values;

  const teamError =
    touched && !values.team?.trim() ? t("f_required") : undefined;

  const setBase = (value: string) => {
    draft.set("team", value);
    draft.set("ywamBase", value);
  };

  return (
    <div className="flex flex-col gap-5">
      <FieldGrid>
        <Field
          id="ficha-team"
          label={t("f_facilitators")}
          required
          full
          hint={t("f_base_hint")}
          error={teamError}
        >
          {(control) => (
            <Input
              {...control}
              value={values.team ?? ""}
              placeholder={t("placeholder_facilitators")}
              autoComplete="off"
              aria-invalid={Boolean(teamError)}
              onBlur={() => setTouched(true)}
              onChange={(event) => setBase(event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-leader" label={t("f_leader")}>
          {(control) => (
            <Input
              {...control}
              value={values.teamLeader ?? ""}
              placeholder={t("placeholder_leader")}
              autoComplete="off"
              onChange={(event) => draft.set("teamLeader", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-leader-contact" label={t("f_leader_contact")}>
          {(control) => (
            <Input
              {...control}
              value={values.teamLeaderContact ?? ""}
              placeholder={t("f_contact")}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                draft.set("teamLeaderContact", event.target.value)
              }
            />
          )}
        </Field>

        <Field id="ficha-mentor" label={t("f_mentor")}>
          {(control) => (
            <Input
              {...control}
              value={values.mentor ?? ""}
              autoComplete="off"
              onChange={(event) => draft.set("mentor", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-mentor-contact" label={t("f_mentor_contact")}>
          {(control) => (
            <Input
              {...control}
              value={values.mentorContact ?? ""}
              placeholder={t("f_contact")}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                draft.set("mentorContact", event.target.value)
              }
            />
          )}
        </Field>

        <Field id="ficha-team-contact" label={t("f_team_contact")}>
          {(control) => (
            <Input
              {...control}
              value={values.teamContact ?? ""}
              placeholder={t("placeholder_team_contact")}
              autoComplete="off"
              onChange={(event) => draft.set("teamContact", event.target.value)}
            />
          )}
        </Field>

        <Field id="ficha-partner" label={t("f_partner")}>
          {(control) => (
            <Input
              {...control}
              value={values.partnerOrg ?? ""}
              autoComplete="off"
              onChange={(event) => draft.set("partnerOrg", event.target.value)}
            />
          )}
        </Field>

        <Field
          id="ficha-translators"
          label={t("f_translators")}
          full
          hint={t("f_people_hint")}
        >
          {(control) => (
            <PeopleField
              control={control}
              value={values.translators ?? ""}
              placeholder={t("placeholder_translators")}
              onChange={(next) => draft.set("translators", next)}
            />
          )}
        </Field>

        <Field
          id="ficha-reviewers"
          label={t("f_reviewers")}
          full
          hint={t("f_people_hint")}
        >
          {(control) => (
            <PeopleField
              control={control}
              value={values.technicalReviewers ?? ""}
              placeholder={t("placeholder_translators")}
              onChange={(next) => draft.set("technicalReviewers", next)}
            />
          )}
        </Field>
      </FieldGrid>

      {values.sensitiveCountry && <SensitiveContacts />}

      <RegionalRoles location={values.location ?? ""} />
    </div>
  );
}
