import type { ComponentType } from "react";
import type { RecordTabId } from "../../../../constants/recordTabs";
import type { RecordTabProps } from "../types";
import { EquipeTab } from "./Equipe";
import { IdentidadeTab } from "./Identidade";
import { MateriaisTab } from "./Materiais";
import { MidiaTab } from "./Midia";
import { NecessidadesTab } from "./Necessidades";
import { NotasTab } from "./Notas";
import { ObjetivoTab } from "./Objetivo";
import { ProgressoTab } from "./Progresso";
import { RecursosTab } from "./Recursos";
import { SaudeTab } from "./Saude";

export const TAB_COMPONENTS: Record<
  RecordTabId,
  ComponentType<RecordTabProps>
> = {
  identidade: IdentidadeTab,
  equipe: EquipeTab,
  objetivo: ObjetivoTab,
  recursos: RecursosTab,
  progresso: ProgressoTab,
  saude: SaudeTab,
  necessidades: NecessidadesTab,
  midia: MidiaTab,
  notas: NotasTab,
  materiais: MateriaisTab,
};
