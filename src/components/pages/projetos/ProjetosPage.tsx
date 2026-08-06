import { EmptyState } from "../../common/EmptyState";

export function ProjetosPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Projetos"
        message="O mapa vivo dos projetos de tradução — onde está cada equipe, como avança e o que precisa. Os cartões, o globo e os filtros chegam nas próximas entregas."
      />
    </section>
  );
}
