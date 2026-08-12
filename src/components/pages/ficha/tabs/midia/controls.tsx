import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MediaAuthorization } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { formatDate } from "../../../../../utils/format";
import { isMediaAuthorized } from "../../../../../utils/media";
import { CheckboxField } from "../../../../ui";

export function MediaHeading({
  emoji,
  children,
  className,
}: {
  emoji: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h4
      className={cn(
        "text-micro font-bold tracking-[0.1em] uppercase text-fg-muted",
        className,
      )}
    >
      <span aria-hidden>{emoji} </span>
      {children}
    </h4>
  );
}

export function MediaCaption({ children }: { children: ReactNode }) {
  return (
    <p className="text-center font-serif text-micro italic leading-[1.3] text-fg-muted">
      {children}
    </p>
  );
}

export function SensitiveMediaNote() {
  const { t } = useTranslation();
  return (
    <p className="flex items-start gap-2.5 rounded-[12px] border border-telha bg-accent-soft px-4 py-3 text-micro leading-[1.45] text-fg">
      <ShieldAlert
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="mt-px shrink-0 text-telha"
      />
      {t("media_auth_sensitive")}
    </p>
  );
}

export function AuthEvidence({
  authorization,
  className,
}: {
  authorization: MediaAuthorization | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!authorization) {
    return (
      <p className={cn("text-micro text-fg-subtle", className)}>
        {t("media_auth_pending")}
      </p>
    );
  }
  const evidence = [authorization.by, formatDate(authorization.at)]
    .filter(Boolean)
    .join(" · ");
  if (!evidence) return null;
  return <p className={cn("text-micro text-fg-subtle", className)}>{evidence}</p>;
}

export function AuthStatus({
  authorization,
}: {
  authorization: MediaAuthorization | null | undefined;
}) {
  const { t } = useTranslation();
  const granted = isMediaAuthorized({ authorization });
  return (
    <div className="flex flex-col gap-0.5">
      <p
        className={cn(
          "text-center font-serif text-micro font-bold italic",
          granted ? "text-verde-claro" : "text-telha",
        )}
      >
        <span aria-hidden>{granted ? "✓ " : "⊘ "}</span>
        {granted ? t("media_auth_yes") : t("media_auth_no")}
      </p>
      <AuthEvidence authorization={authorization} className="text-center" />
    </div>
  );
}

export function AuthToggle({
  id,
  authorization,
  disabled,
  onDecide,
}: {
  id: string;
  authorization: MediaAuthorization | null | undefined;
  disabled: boolean;
  onDecide: (granted: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-0.5">
      <CheckboxField
        id={id}
        label={t("media_auth_label")}
        checked={isMediaAuthorized({ authorization })}
        disabled={disabled}
        onCheckedChange={(next) => onDecide(next === true)}
      />
      {!disabled && <AuthEvidence authorization={authorization} className="pl-7.5" />}
    </div>
  );
}
