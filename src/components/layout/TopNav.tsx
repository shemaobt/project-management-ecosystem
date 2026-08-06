import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";

const NAV_ITEMS = [
  { to: "/projetos", label: "Projetos" },
  { to: "/ritmo", label: "Ritmo" },
  { to: "/oracao", label: "Oração" },
  { to: "/eten", label: "ETEN" },
  { to: "/formularios", label: "Formulários" },
  { to: "/equipe", label: "Equipe" },
] as const;

export function TopNav() {
  return (
    <nav
      aria-label="Áreas"
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
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
