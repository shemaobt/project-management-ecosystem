import { EmptyState } from "../../common/EmptyState";

export function EtenPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="ETEN"
        message="O relatório anual de créditos — seletor de ano, indicadores e exportações com a marca Shemá. Chega nas próximas entregas."
      />
    </section>
  );
}
