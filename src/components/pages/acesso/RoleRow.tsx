import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ApiFailure } from "../../../types/session";
import { Badge, Button } from "../../ui";
import { RefusalNote } from "./RefusalNote";

export interface RoleRowProps {
  label: string;
  note?: string;
  held: boolean;
  busy: boolean;
  locked: boolean;
  refusal: ApiFailure | null;
  onGrant: () => void;
  onRevoke: () => void;
  children?: ReactNode;
}

export function RoleRow({
  label,
  note,
  held,
  busy,
  locked,
  refusal,
  onGrant,
  onRevoke,
  children,
}: RoleRowProps) {
  const { t } = useTranslation();

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-small font-semibold text-fg">{label}</span>
          {note ? (
            <span className="text-micro leading-[1.45] text-fg-muted">{note}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5">
          {held ? (
            <Badge tone="green">
              <Check size={12} strokeWidth={2} aria-hidden />
              {t("acesso_role_held")}
            </Badge>
          ) : (
            <Badge tone="neutral">{t("acesso_role_not_held")}</Badge>
          )}
          <Button
            size="sm"
            variant={held ? "ghost" : "secondary"}
            disabled={locked}
            onClick={held ? onRevoke : onGrant}
          >
            {busy
              ? t("acesso_saving")
              : held
                ? t("acesso_revoke")
                : t("acesso_grant")}
          </Button>
        </div>
      </div>
      {children}
      {refusal ? <RefusalNote failure={refusal} /> : null}
    </li>
  );
}
