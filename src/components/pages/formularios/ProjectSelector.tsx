import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../../types/project";
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
}

export function ProjectSelector({
  projects,
  value,
  onChange,
}: ProjectSelectorProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <Label htmlFor={fieldId}>{t("forms_pick_project")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={t("forms_pick_project")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.team
                ? `${project.languageName} · ${project.team}`
                : project.languageName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
