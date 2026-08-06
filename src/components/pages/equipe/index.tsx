import { EmptyState } from "../../common/EmptyState";

export function EquipePage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Equipe"
        message="O organograma vivo — quem cuida de cada região, nos três papéis, em uma única fonte de verdade. Chega nas próximas entregas."
      />
    </section>
  );
}
