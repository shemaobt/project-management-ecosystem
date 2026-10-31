import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../../types/project";
import { projectOptionLabel } from "../../../utils/forms";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui";

export interface ProjectSelectorProps {
  projects: readonly Project[];
  value: string;
  onChange: (projectId: string) => void;
  onOpen?: () => void;
}

export function ProjectSelector({
  projects,
  value,
  onChange,
  onOpen,
}: ProjectSelectorProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <Label htmlFor={fieldId}>{t("forms_pick_project")}</Label>
      <Select
        value={value}
        onValueChange={onChange}
        onOpenChange={(open) => {
          if (open) onOpen?.();
        }}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={t("forms_pick_project")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {projectOptionLabel(project, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
