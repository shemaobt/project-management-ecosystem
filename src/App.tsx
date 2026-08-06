import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DesignSystemPage } from "./components/pages/design-system/DesignSystemPage";
import { EquipePage } from "./components/pages/equipe";
import { EtenPage } from "./components/pages/eten";
import { FormulariosPage } from "./components/pages/formularios";
import { IntercessoresPage } from "./components/pages/intercessores";
import { OracaoPage } from "./components/pages/oracao";
import { ProjetosPage } from "./components/pages/projetos";
import { RitmoPage } from "./components/pages/ritmo";
import { Toaster } from "./components/ui";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/projetos" replace />} />
              <Route path="projetos" element={<ProjetosPage />} />
              <Route path="ritmo" element={<RitmoPage />} />
              <Route path="oracao" element={<OracaoPage />} />
              <Route
                path="oracao/intercessores"
                element={<IntercessoresPage />}
              />
              <Route path="eten" element={<EtenPage />} />
              <Route path="formularios" element={<FormulariosPage />} />
              <Route path="equipe" element={<EquipePage />} />
            </Route>
            <Route path="design-system" element={<DesignSystemPage />} />
            <Route path="*" element={<Navigate to="/projetos" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
