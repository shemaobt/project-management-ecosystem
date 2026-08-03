import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DesignSystemPage } from "./components/pages/design-system/DesignSystemPage";
import { Toaster } from "./components/ui";

const PALETTE = [
  { token: "branco", swatch: "bg-branco", variable: "--shema-branco" },
  { token: "areia", swatch: "bg-areia", variable: "--shema-areia" },
  { token: "azul", swatch: "bg-azul", variable: "--shema-azul" },
  { token: "telha", swatch: "bg-telha", variable: "--shema-telha" },
  {
    token: "verde-claro",
    swatch: "bg-verde-claro",
    variable: "--shema-verde-claro",
  },
  { token: "verde", swatch: "bg-verde", variable: "--shema-verde" },
  { token: "preto", swatch: "bg-preto", variable: "--shema-preto" },
];

const SEMANTIC = [
  { token: "bg-canvas", swatch: "bg-canvas" },
  { token: "bg-elevated", swatch: "bg-elevated" },
  { token: "bg-muted", swatch: "bg-muted" },
  { token: "bg-quiet", swatch: "bg-quiet" },
  { token: "bg-inverse", swatch: "bg-inverse" },
  { token: "bg-accent", swatch: "bg-accent" },
  { token: "bg-accent-soft", swatch: "bg-accent-soft" },
];

const TYPE_SCALE = [
  { token: "display", size: "88px", className: "text-display" },
  { token: "h1", size: "56px", className: "text-h1" },
  { token: "h2", size: "40px", className: "text-h2" },
  { token: "h3", size: "28px", className: "text-h3" },
  { token: "h4", size: "22px", className: "text-h4" },
  { token: "lead", size: "20px", className: "text-lead" },
  { token: "body", size: "16px", className: "text-body" },
  { token: "small", size: "14px", className: "text-small" },
  { token: "micro", size: "12px", className: "text-micro" },
];

const ICON_MARKS = [
  { file: "icon-telha.svg", surface: "bg-elevated" },
  { file: "icon-verde.svg", surface: "bg-elevated" },
  { file: "icon-verde-claro.svg", surface: "bg-elevated" },
  { file: "icon-preto.svg", surface: "bg-elevated" },
  { file: "icon-branco.svg", surface: "bg-inverse" },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-eyebrow uppercase text-fg-muted">{children}</p>
  );
}

function TokensPreview() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center gap-4 bg-inverse px-8 py-5">
        <img src="/brand/icon-telha.svg" alt="Shemá" className="h-6" />
        <span className="h-6 w-px bg-line-on-dark" />
        <span className="font-serif text-small italic text-areia">
          Ecossistema — Gestão de Projetos
        </span>
      </header>

      <main className="mx-auto flex max-w-(--container-max) flex-col gap-12 px-8 py-12">
        <section className="flex flex-col gap-3">
          <Eyebrow>FE-02 · Design System</Eyebrow>
          <h1>Tokens do Shemá</h1>
          <p className="text-lead max-w-(--container-narrow) text-fg-muted">
            Paleta, tipografia, espaçamento, raios, sombras e movimento portados
            de <span className="font-serif italic">DS-PROJECT</span>. As telas
            chegam a partir de FE-06.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>Paleta da marca</Eyebrow>
          <div className="flex flex-wrap gap-4">
            {PALETTE.map((color) => (
              <div key={color.token} className="flex flex-col gap-2">
                <div
                  className={`${color.swatch} h-20 w-36 rounded-md shadow-card`}
                />
                <div className="flex flex-col">
                  <span className="text-small font-semibold">{color.token}</span>
                  <span className="text-micro text-fg-subtle">
                    {color.variable}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>Camada semântica</Eyebrow>
          <div className="flex flex-wrap gap-4">
            {SEMANTIC.map((surface) => (
              <div key={surface.token} className="flex flex-col gap-2">
                <div
                  className={`${surface.swatch} h-20 w-36 rounded-md shadow-card`}
                />
                <span className="text-micro text-fg-subtle">{surface.token}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>Escala tipográfica</Eyebrow>
          <div className="flex flex-col gap-4 rounded-lg bg-elevated p-8 shadow-card">
            {TYPE_SCALE.map((step) => (
              <div key={step.token} className="flex items-baseline gap-6">
                <span className="w-28 shrink-0 text-micro text-fg-subtle">
                  {step.token} · {step.size}
                </span>
                <span className={`${step.className} truncate text-fg-strong`}>
                  Shemá
                </span>
              </div>
            ))}
            <div className="flex items-baseline gap-6">
              <span className="w-28 shrink-0 text-micro text-fg-subtle">
                serif · italic
              </span>
              <span className="font-serif text-h3 italic text-fg-strong">
                Ouve, ó Israel
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>Marca</Eyebrow>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg bg-elevated p-6 shadow-card">
              <img
                src="/brand/logo-tagline-verde.svg"
                alt="Shemá"
                className="h-24"
              />
            </div>
            <div className="rounded-lg bg-elevated p-6 shadow-card">
              <img src="/brand/logo-telha.svg" alt="Shemá" className="h-24" />
            </div>
            <div
              className="h-36 w-56 rounded-lg bg-quiet bg-[url(/brand/pattern-tile.svg)] bg-repeat [background-size:64px_64px] shadow-card"
              role="img"
              aria-label="Pattern tile"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            {ICON_MARKS.map((mark) => (
              <div
                key={mark.file}
                className={`${mark.surface} flex h-16 w-28 items-center justify-center rounded-md shadow-card`}
              >
                <img src={`/brand/${mark.file}`} alt={mark.file} className="h-5" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="*" element={<TokensPreview />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
