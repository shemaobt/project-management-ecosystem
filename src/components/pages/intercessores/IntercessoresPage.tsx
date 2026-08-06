import { EmptyState } from "../../common/EmptyState";

export function IntercessoresPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Intercessores"
        message="A rede que sustenta os projetos em oração, organizada por país. Chega nas próximas entregas."
      />
    </section>
  );
}
