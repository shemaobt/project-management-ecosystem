import { Link } from "react-router-dom";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";

export function OracaoPage() {
  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title="Oração"
        message="O mural que reúne os pedidos compartilhados por cada projeto — sempre com o consentimento do líder de campo. Chega nas próximas entregas."
        action={
          <Button asChild variant="secondary">
            <Link to="/oracao/intercessores">Intercessores</Link>
          </Button>
        }
      />
    </section>
  );
}
