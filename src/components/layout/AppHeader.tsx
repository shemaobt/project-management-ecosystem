import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "../../i18n";
import { DEFAULT_TAB } from "../../constants/recordTabs";
import { NEW_RECORD } from "../../stores/recordStore";
import { BrandMark } from "../common/BrandMark";
import { NotificationBell } from "./NotificationBell";
import { toast } from "../ui";
import { usePrefsStore } from "../../stores/prefsStore";
import { cn } from "../../utils/cn";

const TB_BTN = cn(
  "inline-flex items-center gap-1.5 rounded-pill border border-branco/[0.22]",
  "px-3.5 py-2 text-[13px] font-semibold tracking-button text-on-dark",
  "transition-all duration-fast ease-out",
  "hover:border-branco/40 hover:bg-branco/[0.08]",
);

const PENDING_ACTIONS = [
  { key: "field", glyph: "📨", labelKey: "btn_field" },
  { key: "export", glyph: "↓", labelKey: "btn_export" },
  { key: "import", glyph: "↑", labelKey: "btn_import" },
  {
    key: "reload",
    glyph: "⟳",
    labelKey: "btn_reload",
    titleKey: "btn_reload_title",
  },
  { key: "intake", glyph: "🔗", labelKey: "btn_intake" },
] as const;

export function AppHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lang = usePrefsStore((state) => state.lang);
  const toggleLang = usePrefsStore((state) => state.toggleLang);

  const notifyPending = (label: string) => {
    toast(t("toast_pending", { label }));
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
        <BrandMark className="text-telha" />
        <span>SHEMA</span>
        <span className="h-6 w-px bg-branco/30" />
        <span className="hidden font-serif text-small font-normal normal-case italic tracking-normal text-areia sm:inline">
          {t("app_sub")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className={cn(TB_BTN, "text-micro font-bold")}
          title={t("lang_toggle")}
          onClick={toggleLang}
        >
          {lang === "pt" ? "🇺🇸 EN" : "🇧🇷 PT"}
        </button>
        <NotificationBell className={TB_BTN} />
        {PENDING_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            className={TB_BTN}
            title={"titleKey" in action ? t(action.titleKey) : undefined}
            onClick={() => notifyPending(t(action.labelKey))}
          >
            {action.glyph} {t(action.labelKey)}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            TB_BTN,
            "border-telha bg-telha hover:border-accent-hover hover:bg-accent-hover",
          )}
          onClick={() => navigate(`/ficha/${NEW_RECORD}/${DEFAULT_TAB}`)}
        >
          + {t("btn_new")}
        </button>
      </div>
    </header>
  );
}
