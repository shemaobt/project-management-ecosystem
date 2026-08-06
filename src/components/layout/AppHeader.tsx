import { Bell } from "lucide-react";
import { toast } from "../ui";
import { usePrefsStore } from "../../stores/prefsStore";
import { cn } from "../../utils/cn";

const TB_BTN = cn(
  "inline-flex items-center gap-1.5 rounded-pill border border-branco/[0.22]",
  "px-3.5 py-2 text-[13px] font-semibold tracking-button text-branco",
  "transition-all duration-fast ease-out",
  "hover:border-branco/40 hover:bg-branco/[0.08]",
);

const PENDING_ACTIONS = [
  { key: "field", glyph: "📨", label: "Receber Atualização" },
  { key: "export", glyph: "↓", label: "Exportar" },
  { key: "import", glyph: "↑", label: "Importar" },
  {
    key: "reload",
    glyph: "⟳",
    label: "Recarregar",
    title: "Recarregar dados da planilha (limpa o cache local)",
  },
  { key: "intake", glyph: "🔗", label: "Link do líder" },
] as const;

function notifyPending(label: string) {
  toast(`"${label}" ainda não está disponível — chega nas próximas entregas.`);
}

function BrandMark() {
  return (
    <span className="h-[22px] w-[38px] shrink-0">
      <svg
        viewBox="280 230 620 270"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full fill-telha"
        aria-hidden
      >
        <path d="M659.67,369.42V248.87H579.45A111.89,111.89,0,0,0,545.83,254c-28.48,8.95-46.6,36.88-46.6,36.88h0s-18.06-27.91-46.6-36.88A112,112,0,0,0,419,248.87H338.78V488.69H419a111.69,111.69,0,0,1,33.63,5.08c28.54,9,46.6,35,46.6,35h0s15.93-22.92,41.38-33.16q-.2-3.45-.2-6.94A119.4,119.4,0,0,1,659.67,369.42Z" />
        <path d="M630.44,488.69h29.23V459.26A29.36,29.36,0,0,0,630.44,488.69Z" />
        <path d="M593.31,488.69h21.35a45.16,45.16,0,0,1,45-45.21V422.33A66.44,66.44,0,0,0,593.31,488.69Z" />
        <path d="M556.19,488.69c0,.8,0,1.59,0,2.39a112.11,112.11,0,0,1,21.31-2.35v0a82.24,82.24,0,0,1,82.14-82.14V385.2A103.6,103.6,0,0,0,556.19,488.69Z" />
      </svg>
    </span>
  );
}

export function AppHeader() {
  const lang = usePrefsStore((state) => state.lang);
  const toggleLang = usePrefsStore((state) => state.toggleLang);

  const handleLangToggle = () => {
    toggleLang();
    toast(
      "Preferência de idioma salva — a tradução da interface chega com o i18n.",
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex flex-wrap items-center justify-between",
        "gap-x-6 gap-y-2.5 border-b border-preto/20 bg-inverse text-on-dark",
        "px-4.5 py-3.5 sm:px-8 sm:py-[18px]",
      )}
    >
      <div className="flex items-center gap-3.5 text-lg font-black uppercase tracking-[0.02em]">
        <BrandMark />
        <span>SHEMA</span>
        <span className="h-6 w-px bg-branco/30" />
        <span className="hidden font-serif text-small font-normal normal-case italic tracking-normal text-areia sm:inline">
          Ecossistema de Projetos Internacionais · YWAM
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className={cn(TB_BTN, "text-micro font-bold")}
          title="Language"
          onClick={handleLangToggle}
        >
          {lang === "pt" ? "🇺🇸 EN" : "🇧🇷 PT"}
        </button>
        <button
          type="button"
          className={TB_BTN}
          title="Notificações"
          onClick={() => notifyPending("Notificações")}
        >
          <Bell size={16} strokeWidth={2} aria-hidden />
          <span className="sr-only">Notificações</span>
        </button>
        {PENDING_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            className={TB_BTN}
            title={"title" in action ? action.title : undefined}
            onClick={() => notifyPending(action.label)}
          >
            {action.glyph} {action.label}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            TB_BTN,
            "border-telha bg-telha hover:border-accent-hover hover:bg-accent-hover",
          )}
          onClick={() => notifyPending("Novo Projeto")}
        >
          + Novo Projeto
        </button>
      </div>
    </header>
  );
}
