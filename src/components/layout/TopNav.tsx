import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

const NAV_ITEMS = [
  { to: "/projetos", labelKey: "nav_projetos" },
  { to: "/ritmo", labelKey: "nav_ritmo" },
  { to: "/oracao", labelKey: "nav_oracao" },
  { to: "/eten", labelKey: "nav_eten" },
  { to: "/formularios", labelKey: "nav_formularios" },
  { to: "/equipe", labelKey: "nav_equipe" },
] as const;

export function TopNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav_areas")}
      className={cn(
        "mx-auto flex w-full max-w-(--container-max) gap-1 overflow-x-auto",
        "border-b border-line px-(--container-pad)",
      )}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "-mb-px shrink-0 border-b-2 border-transparent px-4.5 py-3.5",
              "text-small font-bold tracking-[0.02em] text-fg-subtle no-underline",
              "transition-colors duration-fast ease-out",
              "hover:text-verde hover:no-underline",
              isActive && "border-telha text-telha hover:text-telha",
            )
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
