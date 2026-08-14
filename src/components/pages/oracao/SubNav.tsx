import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { cn } from "../../../utils/cn";

const subtab =
  "rounded-pill px-5 py-2.75 text-[13px] leading-none font-bold tracking-[0.02em] text-fg-muted";

const subtabOn = "bg-canvas text-telha shadow-sm";

export function SubNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("oracao_subnav_label")}
      className="mb-5.5 inline-flex gap-1 rounded-pill bg-muted p-1"
    >
      <NavLink
        to="/oracao"
        end
        className={({ isActive }) => cn(subtab, isActive && subtabOn)}
      >
        {t("oracao_sub_mural")}
      </NavLink>
      <NavLink
        to="/oracao/intercessores"
        className={({ isActive }) => cn(subtab, isActive && subtabOn)}
      >
        {t("oracao_sub_rede")}
      </NavLink>
    </nav>
  );
}
