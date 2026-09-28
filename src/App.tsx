import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { SessionGate } from "./components/layout/SessionGate";
import { AcessoPage } from "./components/pages/acesso";
import { AvaliacaoPage } from "./components/pages/avaliacao";
import { ConvitePage } from "./components/pages/convite";
import { DesignSystemPage } from "./components/pages/design-system/DesignSystemPage";
import { EquipePage } from "./components/pages/equipe";
import { EtenPage } from "./components/pages/eten";
import { FichaPage } from "./components/pages/ficha";
import { FormulariosPage } from "./components/pages/formularios";
import { InicioPage } from "./components/pages/inicio";
import { IntakePage } from "./components/pages/intake";
import { IntercessoresPage } from "./components/pages/intercessores/IntercessoresPage";
import { OracaoPage } from "./components/pages/oracao";
import { ProjetosPage } from "./components/pages/projetos/ProjetosPage";
import { RitmoPage } from "./components/pages/ritmo/RitmoPage";
import { RelatorioPage } from "./components/pages/ritmo/relatorio/RelatorioPage";
import { Toaster } from "./components/ui";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { accessAPI } from "./services/api";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {accessAPI ? (
              <Route path="convite" element={<ConvitePage api={accessAPI} />} />
            ) : null}
            {/* No session, no console: the leader link's whole page (§8, §9.13 —
                the leader has no account, so this route must not reach SessionGate). */}
            <Route path="intake/:token" element={<IntakePage />} />
            <Route
              path="*"
              element={
                <SessionGate>
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route index element={<InicioPage />} />
                      <Route path="projetos" element={<ProjetosPage />} />
                      <Route path="ficha/:recordId" element={<FichaPage />} />
                      <Route
                        path="ficha/:recordId/:tab"
                        element={<FichaPage />}
                      />
                      <Route path="ritmo" element={<RitmoPage />} />
                      <Route
                        path="ritmo/relatorio/:year?"
                        element={<RelatorioPage />}
                      />
                      <Route path="oracao" element={<OracaoPage />} />
                      <Route
                        path="oracao/intercessores"
                        element={<IntercessoresPage />}
                      />
                      <Route path="eten" element={<EtenPage />} />
                      <Route
                        path="formularios"
                        element={<FormulariosPage />}
                      />
                      <Route
                        path="formularios/avaliacao/:projectId"
                        element={<AvaliacaoPage />}
                      />
                      <Route path="equipe" element={<EquipePage />} />
                      {accessAPI ? (
                        <Route
                          path="acesso"
                          element={<AcessoPage api={accessAPI} />}
                        />
                      ) : null}
                    </Route>
                    <Route
                      path="design-system"
                      element={<DesignSystemPage />}
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/projetos" replace />}
                    />
                  </Routes>
                </SessionGate>
              }
            />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
