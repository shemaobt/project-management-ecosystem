import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { RoleSwitcher } from "./RoleSwitcher";
import { TopNav } from "./TopNav";

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
