import { EmptyState } from "../../common/EmptyState";

export function RitmoPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Ritmo"
        message="A cascata de escuta do ecossistema — as reuniões que mantêm as respostas do campo em dia, da regional mensal à celebração anual. Chega nas próximas entregas."
      />
    </section>
  );
}
