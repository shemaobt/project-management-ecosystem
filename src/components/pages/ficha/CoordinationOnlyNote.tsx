import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";
import { ROLE_DEFINITIONS } from "../../../constants/roles";

export interface CoordinationOnlyNoteProps {
  textKey?: string;
}

export function CoordinationOnlyNote({
  textKey = "f_location_coordination_only",
}: CoordinationOnlyNoteProps) {
  const { t } = useTranslation();

  return (
    <p className="flex items-start gap-2.5 rounded-[12px] border border-line-strong bg-muted px-4 py-3 text-micro leading-[1.45] text-fg">
      <Lock
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="mt-px shrink-0 text-fg-muted"
      />
      {t(textKey, {
        regional: t(ROLE_DEFINITIONS.coordinator.labelKey),
        admin: t(SESSION_ROLE_LABEL_KEYS.admin),
      })}
    </p>
  );
}
