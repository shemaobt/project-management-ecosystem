import { Inbox } from "lucide-react";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Progress,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../ui";
import { Section } from "./Section";

const SURFACES = ["elevated", "outlined", "soft", "paper"] as const;

export function SurfacesSection() {
  return (
    <>
      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-4">
          {SURFACES.map((v) => (
            <Card key={v} variant={v} interactive>
              <CardHeader>
                <CardTitle>{v}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-small text-fg-muted">Superfície {v}.</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Progress">
        <div className="flex flex-col gap-3">
          <Progress value={62} label="Traduzido" />
          <Progress value={38} tone="community" label="Verificado" />
          <Progress value={21} tone="approved" size="lg" label="Aprovado" />
        </div>
      </Section>

      <Section title="Tabs, Table e estados">
        <Tabs defaultValue="progresso">
          <TabsList>
            <TabsTrigger value="progresso">Progresso</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="saude">Saúde</TabsTrigger>
          </TabsList>
          <TabsContent value="progresso">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Livro</TableHeaderCell>
                  <TableHeaderCell numeric>Traduzido</TableHeaderCell>
                  <TableHeaderCell numeric>Aprovado</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Marcos</TableCell>
                  <TableCell numeric>16</TableCell>
                  <TableCell numeric>12</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Lucas</TableCell>
                  <TableCell numeric>24</TableCell>
                  <TableCell numeric>9</TableCell>
                </TableRow>
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell numeric>40</TableCell>
                  <TableCell numeric>21</TableCell>
                </TableRow>
              </TableFoot>
            </Table>
          </TabsContent>
          <TabsContent value="equipe">
            <EmptyState
              icon={<Inbox size={28} strokeWidth={1.75} />}
              message="Nenhum membro cadastrado ainda."
            />
          </TabsContent>
          <TabsContent value="saude">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72" />
              <LoadingSpinner label="Carregando" />
            </div>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog e Sheet">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Abrir ficha</Button>
            </DialogTrigger>
            <DialogContent closeLabel="Fechar">
              <DialogHeader>
                <div>
                  <DialogTitle>Kaingang</DialogTitle>
                  <DialogDescription>Sul do Brasil · OBT Lab</DialogDescription>
                </div>
              </DialogHeader>
              <DialogBody>
                <p className="text-small text-fg-muted">
                  Conteúdo da ficha do projeto.
                </p>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost">Cancelar</Button>
                <Button>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Abrir notificações</Button>
            </SheetTrigger>
            <SheetContent closeLabel="Fechar">
              <SheetHeader>
                <SheetTitle className="text-h4 font-semibold text-fg-strong">
                  Notificações
                </SheetTitle>
              </SheetHeader>
              <SheetBody>
                <EmptyState message="Nada por aqui ainda." />
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </Section>
    </>
  );
}
