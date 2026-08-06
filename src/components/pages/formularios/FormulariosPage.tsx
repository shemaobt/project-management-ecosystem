import { EmptyState } from "../../common/EmptyState";

export function FormulariosPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Formulários"
        message="A voz do campo — gerar, enviar e receber o Pulso Mensal offline e a Avaliação de Saúde guiada. Chega nas próximas entregas."
      />
    </section>
  );
}
