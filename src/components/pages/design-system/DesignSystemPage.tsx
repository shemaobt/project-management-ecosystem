import { ControlsSection } from "./ControlsSection";
import { StatusSection } from "./StatusSection";
import { SurfacesSection } from "./SurfacesSection";

export function DesignSystemPage() {
  return (
    <div className="mx-auto flex max-w-(--container-max) flex-col gap-12 px-8 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-eyebrow uppercase text-fg-muted">
          FE-03 · Primitivos
        </p>
        <h1>Componentes</h1>
      </header>
      <ControlsSection />
      <StatusSection />
      <SurfacesSection />
    </div>
  );
}
