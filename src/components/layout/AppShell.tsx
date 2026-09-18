import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { skipLink } from "../../styles";
import { CONTENT_ANCHOR_ID } from "../../utils/focus";
import { AppHeader } from "./AppHeader";
import { RoleSwitcher } from "./RoleSwitcher";
import { TopNav } from "./TopNav";

export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <a href={`#${CONTENT_ANCHOR_ID}`} className={skipLink}>
        {t("skip_to_content")}
      </a>
      <AppHeader />
      <TopNav />
      <main id={CONTENT_ANCHOR_ID} tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      {import.meta.env.DEV && <RoleSwitcher />}
    </div>
  );
}
