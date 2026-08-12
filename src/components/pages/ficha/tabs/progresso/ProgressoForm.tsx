import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { materializeDraft } from "../../../../../stores/recordStore";
import { decreasedCounts } from "../../../../../utils/progress";
import { FieldGroup } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { BookTable } from "./BookTable";
import { OtherTable, StoryTable } from "./FreeTable";
import { StatusRadio } from "./StatusRadio";
import { COUNT_LABEL_KEYS, visibleSections } from "./sections";

export interface ProgressoFormProps {
  draft: DraftHandle;
}

function TableSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-3.5">
        <strong className="text-small font-bold tracking-[0.02em] text-fg">
          <span aria-hidden>{icon} </span>
          {title}
        </strong>
        {hint && (
          <em className="font-serif text-micro italic text-fg-muted">{hint}</em>
        )}
      </div>
      {children}
    </section>
  );
}

export function ProgressoForm({ draft }: ProgressoFormProps) {
  const { t } = useTranslation();
  const values = draft.values;
  const project = materializeDraft(values);
  const sections = visibleSections(project);
  const drops = decreasedCounts(project);

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup id="ficha-status" label={t("f_project_status")}>
        <StatusRadio
          value={project.status}
          anchor={draft.saved?.status}
          onChange={(next) => draft.set("status", next)}
        />
      </FieldGroup>

      {drops.length > 0 && (
        <p
          role="status"
          className="rounded-md border-l-4 border-status-attention bg-status-attention-bg px-4 py-3 text-small leading-[1.45] text-status-attention-fg"
        >
          {t("progress_decrease_warn", {
            fields: drops.map((key) => t(COUNT_LABEL_KEYS[key])).join(", "),
          })}
        </p>
      )}

      {sections.books && (
        <TableSection
          icon="📖"
          title={t("progress_books_title")}
          hint={t("progress_books_hint")}
        >
          <BookTable
            rows={project.bookProgress}
            onChange={(rows) => draft.set("bookProgress", rows)}
          />
        </TableSection>
      )}

      {sections.stories && (
        <TableSection
          icon="📚"
          title={t("progress_stories_title")}
          hint={t("progress_stories_hint")}
        >
          <StoryTable
            rows={project.storyProgress}
            onChange={(rows) => draft.set("storyProgress", rows)}
          />
        </TableSection>
      )}

      {sections.other && (
        <TableSection icon="🎬" title={t("progress_other_title")}>
          <OtherTable
            rows={project.otherProgress ?? []}
            onChange={(rows) => draft.set("otherProgress", rows)}
          />
        </TableSection>
      )}

      {!sections.books && !sections.stories && !sections.other && (
        <p className="rounded-md bg-muted px-4 py-3.5 font-serif text-small italic text-fg-muted">
          {t("progress_no_scope_hint")}
        </p>
      )}
    </div>
  );
}
