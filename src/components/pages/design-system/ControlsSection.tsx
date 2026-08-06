import {
  Button,
  CheckboxField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "../../ui";
import { Section } from "./Section";

export function ControlsSection() {
  return (
    <>
      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Salvar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="green">Registrar</Button>
          <Button variant="danger">Remover</Button>
          <Button variant="ghost">Limpar tudo</Button>
          <Button disabled>Indisponível</Button>
          <Button size="sm" onClick={() => toast.success("Salvo")}>
            Toast
          </Button>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lang">Língua</Label>
            <Input id="lang" placeholder="Nome da língua" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em-andamento">Em andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" placeholder="Observações do campo" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 rounded-sm border border-line bg-elevated px-3 py-2.5">
          <CheckboxField id="c1" label="Áudio" defaultChecked />
          <CheckboxField id="c2" label="Vídeo" />
          <CheckboxField id="c3" label="Texto" />
        </div>
      </Section>
    </>
  );
}
