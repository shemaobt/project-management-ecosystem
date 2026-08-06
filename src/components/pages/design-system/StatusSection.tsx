import { useState } from "react";
import { PriorityPin, StatusBadge, StatusDot } from "../../common/StatusBadge";
import { Badge, Chip } from "../../ui";
import { Section } from "./Section";

const HEALTH = [
  { state: "boa", label: "Boa" },
  { state: "atencao", label: "Atenção" },
  { state: "critica", label: "Crítica" },
  { state: "na", label: "N/A" },
] as const;

const STALE = [
  { state: "em-dia", label: "Em dia" },
  { state: "atencao", label: "Sem notícias 60+ dias" },
  { state: "critico", label: "Crítico 120+ dias" },
] as const;

const RHYTHM = [
  { state: "done", label: "Em dia" },
  { state: "pending", label: "A fazer" },
  { state: "overdue", label: "Atrasada" },
  { state: "new", label: "A iniciar" },
] as const;

const PRIORITIES = ["critical", "warning", "completed", "planned"] as const;

export function StatusSection() {
  const [chip, setChip] = useState(true);

  return (
    <>
      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          {HEALTH.map((h) => (
            <StatusBadge key={h.state} kind="health" {...h} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STALE.map((s) => (
            <StatusBadge key={s.state} kind="stale" {...s} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RHYTHM.map((r) => (
            <StatusBadge key={r.state} kind="rhythm" {...r} />
          ))}
          <StatusBadge kind="prayer" state="answered" label="Respondida" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {HEALTH.map((h) => (
            <StatusDot key={h.state} {...h} />
          ))}
          {PRIORITIES.map((p) => (
            <span
              key={p}
              className="flex items-center gap-1.5 text-micro text-fg-subtle"
            >
              <PriorityPin priority={p} />
              {p}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Badge e Chip">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutro</Badge>
          <Badge tone="accent">Telha</Badge>
          <Badge tone="green">Verde</Badge>
          <Badge tone="azul">Azul</Badge>
          <Badge tone="dark" uppercase>
            Escuro
          </Badge>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Chip
            variant="outline"
            label="África"
            count={24}
            active={chip}
            onClick={() => setChip((v) => !v)}
          />
          <Chip variant="outline" label="Ásia" count={31} />
          <div className="w-56 rounded-sm bg-elevated p-2 shadow-card">
            <Chip label="Em andamento" count={42} active />
            <Chip label="Concluído" count={7} />
          </div>
        </div>
      </Section>
    </>
  );
}
