import { Outlet } from "react-router-dom";
import {
  MOCK_SESSION_USERS,
  SESSION_ROLE_LABELS,
  useAuth,
  type SessionRole,
} from "../../contexts/AuthContext";
import { cn } from "../../utils/cn";
import { AppHeader } from "./AppHeader";
import { TopNav } from "./TopNav";

const SESSION_ROLES = Object.keys(MOCK_SESSION_USERS) as SessionRole[];

function RoleSwitcher() {
  const { user, visibleRegions, switchRole } = useAuth();

  return (
    <aside className="fixed bottom-6 left-6 z-50 flex max-w-72 flex-col gap-2 rounded-lg bg-elevated p-4 shadow-lg">
      <span className="text-[11px] font-bold uppercase tracking-eyebrow text-fg-subtle">
        Sessão mockada · dev
      </span>
      <span className="text-small font-semibold text-fg-strong">
        {user.name}
      </span>
      <span className="text-micro text-fg-muted">
        {SESSION_ROLE_LABELS[user.role]} ·{" "}
        {visibleRegions.length === 1
          ? "1 região"
          : `${visibleRegions.length} regiões`}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {SESSION_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => switchRole(role)}
            className={cn(
              "rounded-pill px-2.5 py-1 text-micro font-semibold transition-colors duration-[140ms] ease-out",
              role === user.role
                ? "bg-telha text-branco"
                : "bg-muted text-fg-muted hover:text-verde",
            )}
          >
            {SESSION_ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </aside>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      {import.meta.env.DEV && <RoleSwitcher />}
    </div>
  );
}
