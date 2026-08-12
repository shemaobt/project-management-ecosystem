import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

export function SensitiveContacts() {
  const { t } = useTranslation();

  return (
    <p className="flex items-start gap-2.5 rounded-[12px] border border-telha bg-accent-soft px-4 py-3 text-micro leading-[1.45] text-fg">
      <ShieldAlert
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="mt-px shrink-0 text-telha"
      />
      {t("f_contact_sensitive")}
    </p>
  );
}
