import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../../utils/cn";
import { CheckboxField } from "../../../../ui";

const CONSEQUENCES = [
  "f_sensitive_on_map",
  "f_sensitive_on_cards",
  "f_sensitive_on_pending",
] as const;

export interface SensitiveFlagProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SensitiveFlag({ checked, onChange }: SensitiveFlagProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-[12px] border p-4 transition-colors duration-(--duration-fast)",
        checked ? "border-telha bg-accent-soft" : "border-line-strong bg-muted",
      )}
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className={cn("mt-0.5 shrink-0", checked ? "text-telha" : "text-fg-muted")}
        />
        <div className="min-w-0 flex-1">
          <CheckboxField
            id="ficha-sensitive"
            label={t("f_sensitive")}
            checked={checked}
            onCheckedChange={(next) => onChange(next === true)}
          />
          <p className="mt-1 text-micro text-fg-subtle">
            {t("f_sensitive_hint")}
          </p>
        </div>
      </div>

      {checked && (
        <div className="mt-3.5 border-t border-telha/25 pt-3">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-telha">
            {t("f_sensitive_on_title")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {CONSEQUENCES.map((key) => (
              <li
                key={key}
                className="flex gap-2 text-micro leading-[1.45] text-fg"
              >
                <span aria-hidden className="text-telha">
                  ·
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
