import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { circleControl, transitionColors } from "../../../../../styles";
import type { ProjectPhase } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { Button, Input } from "../../../../ui";
import { appendPhase, patchPhase, phaseTitle, removePhase } from "./phases";

export interface PhasesEditorProps {
  phases: readonly ProjectPhase[];
  onChange: (next: ProjectPhase[]) => void;
}

export function PhasesEditor({ phases, onChange }: PhasesEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      {phases.map((phase, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            className="w-14 flex-none"
            aria-label={t("f_phase_n")}
            placeholder={phaseTitle(phase, index, t("f_phase_n"))}
            value={phase.label}
            onChange={(event) =>
              onChange(patchPhase(phases, index, { label: event.target.value }))
            }
          />
          <Input
            className="flex-1"
            aria-label={t("f_phase_scope")}
            placeholder={t("f_phase_scope")}
            value={phase.scope}
            onChange={(event) =>
              onChange(patchPhase(phases, index, { scope: event.target.value }))
            }
          />
          <Input
            type="date"
            className="w-[150px] flex-none"
            aria-label={t("f_deadline")}
            value={phase.date}
            onChange={(event) =>
              onChange(patchPhase(phases, index, { date: event.target.value }))
            }
          />
          <button
            type="button"
            aria-label={t("f_phase_remove")}
            className={cn(
              circleControl,
              transitionColors,
              "size-9 flex-none bg-muted text-fg-muted hover:text-telha",
            )}
            onClick={() => onChange(removePhase(phases, index))}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-1 self-start"
        onClick={() => onChange(appendPhase(phases))}
      >
        <span aria-hidden>+</span> {t("f_phase_add")}
      </Button>
    </div>
  );
}
