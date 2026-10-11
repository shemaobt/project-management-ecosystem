import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const THEME_KEY = "shema-theme-v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// OBT-505: a paleta escura é nossa e espera a cliente (§7.4), então ela é escolha de quem
// clica, nunca herdada do sistema; "system" volta a ser o padrão quando ela for aprovada.
function loadStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "light";
}

export function applyStoredTheme() {
  applyClass(resolve(loadStoredTheme()));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(loadStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(theme),
  );

  const setTheme = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
    setResolvedTheme(resolve(next));
  }, []);

  useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setResolvedTheme(getSystemTheme());
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
