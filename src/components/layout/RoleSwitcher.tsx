import { useTranslation } from "react-i18next";
import {
  MOCK_SESSION_PERSONAS,
  SESSION_ROLE_LABEL_KEYS,
  UNASSIGNED_HOLDER_KEY,
  useAuth,
} from "../../contexts/AuthContext";
import { cn } from "../../utils/cn";

// Keyed by the persona, not by its `role`: the Admin persona's head role is `coordinator`
// (OBT-572), so the role alone would not tell the two apart.
const PERSONAS = Object.entries(MOCK_SESSION_PERSONAS) as [
  keyof typeof MOCK_SESSION_PERSONAS,
  (typeof MOCK_SESSION_PERSONAS)[keyof typeof MOCK_SESSION_PERSONAS],
][];

export function RoleSwitcher() {
  const { t } = useTranslation();
  const { status, user, visibleRegions, switchRole } = useAuth();

  if (!switchRole) return null;

  // The label under the active pill is the persona's, not the head role's: the Admin persona
  // opens by `coordinator` (OBT-572) and would otherwise read as one.
  const active = PERSONAS.find(([, persona]) => persona.id === user.id)?.[0] ?? user.role;

  return (
    <aside className="fixed bottom-6 left-6 z-50 flex max-w-72 flex-col gap-2 rounded-lg bg-elevated p-4 shadow-lg">
      <span className="text-[11px] font-bold uppercase tracking-eyebrow text-fg-subtle">
        Sessão mockada · dev
      </span>
      <span className="text-small font-semibold text-fg-strong">
        {user.name ?? t(UNASSIGNED_HOLDER_KEY)}
      </span>
      <span className="text-micro text-fg-muted">
        {t(SESSION_ROLE_LABEL_KEYS[active])} ·{" "}
        {status === "loading"
          ? "carregando regiões…"
          : visibleRegions.length === 1
            ? "1 região visível"
            : `${visibleRegions.length} regiões visíveis`}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {PERSONAS.map(([key, persona]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchRole(key)}
            className={cn(
              "rounded-pill px-2.5 py-1 text-micro font-semibold transition-colors duration-fast ease-out",
              persona.id === user.id
                ? "bg-telha text-on-brand"
                : "bg-muted text-fg-muted hover:text-fg",
            )}
          >
            {t(SESSION_ROLE_LABEL_KEYS[key])}
          </button>
        ))}
      </div>
    </aside>
  );
}
