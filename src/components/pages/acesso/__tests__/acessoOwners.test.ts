import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TEST_FILE = /(?:^|\/)__tests__\//u;

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const flat = (text: string) => text.replace(/\s+/gu, "");

const posix = (path: string) => relative(ROOT, join(ROOT, path)).split("\\").join("/");

const NEW_SURFACES = [
  "src/components/pages/acesso",
  "src/components/pages/convite",
];

const shipped = NEW_SURFACES.flatMap(walk)
  .map(posix)
  .filter((path) => /\.tsx?$/u.test(path) && !TEST_FILE.test(path));

const tests = NEW_SURFACES.flatMap(walk)
  .map(posix)
  .filter((path) => TEST_FILE.test(path));

const everywhere = ["src/components", "src/stores", "src/contexts", "src/hooks"]
  .flatMap(walk)
  .map(posix)
  .filter((path) => /\.tsx?$/u.test(path) && !TEST_FILE.test(path));

describe("o corpus das varreduras", () => {
  it("enxerga as duas páginas e deixa os testes de fora", () => {
    expect(shipped).toContain("src/components/pages/acesso/index.tsx");
    expect(shipped).toContain("src/components/pages/convite/index.tsx");
    expect(shipped.some((path) => TEST_FILE.test(path))).toBe(false);
    expect(tests).toContain("src/components/pages/acesso/__tests__/acessoOwners.test.ts");
  });
});

describe("o link do convite aparece uma vez e não fica guardado", () => {
  it("nenhum arquivo das duas páginas grava coisa alguma no navegador", () => {
    const offenders = shipped.filter((path) =>
      /\b(?:localStorage|sessionStorage|indexedDB|persist\()/u.test(read(path)),
    );
    expect(offenders).toEqual([]);
  });

  it("só o painel do convite recém-criado lê o link — nenhuma lista, nenhum store", () => {
    const readers = everywhere.filter((path) => read(path).includes("inviteUrl"));
    expect(readers).toEqual(["src/components/pages/acesso/InvitesSection.tsx"]);
  });
});

describe("pôr e tirar membro reflete na aba Equipe da ficha", () => {
  const section = read("src/components/pages/acesso/MembershipSection.tsx");
  const tab = read("src/components/pages/ficha/tabs/equipe/ProjectMembers.tsx");
  const mount = read("src/components/pages/ficha/tabs/Equipe.tsx");

  it("as duas pontas falam com o mesmo membersAPI da camada de API", () => {
    for (const source of [section, tab]) {
      expect(source).toMatch(/import \{[^}]*\bmembersAPI\b[^}]*\} from "\.\.\/(?:\.\.\/)+services\/api";/u);
    }
    expect(flat(section)).toContain("membersAPI.add(projectId,person.userId)");
    expect(flat(section)).toContain("membersAPI.remove(projectId,person.userId)");
    expect(flat(section)).toContain("membersAPI.list(projectId)");
    expect(flat(tab)).toContain("membersAPI.list(projectId)");
  });

  it("a aba relê o rol do servidor a cada montagem, pelo id do projeto — não há cópia para envelhecer", () => {
    expect(flat(mount)).toContain("<ProjectMemberskey={projectId}projectId={projectId}/>");
    const stores = walk("src/stores")
      .map(posix)
      .filter((path) => /\.ts$/u.test(path) && !TEST_FILE.test(path));
    expect(stores.length).toBeGreaterThan(5);
    expect(stores.filter((path) => read(path).includes("ProjectMember"))).toEqual([]);
  });

  it("tirar alguém confirma com o aviso de que o histórico fica", () => {
    const dialog = section.slice(section.indexOf("<ConfirmDialog"));
    expect(dialog).toContain('t("acesso_member_remove_warning")');
  });
});

describe("nenhum nome real", () => {
  const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu;

  it("as páginas não carregam endereço nenhum", () => {
    expect(shipped.filter((path) => EMAIL.test(read(path)))).toEqual([]);
  });

  it("os dados de teste usam só o domínio de exemplo", () => {
    const addresses = [
      ...tests,
      "src/services/api/__tests__/access.test.ts",
      "src/components/common/__tests__/commonControls.test.ts",
    ].flatMap((path) => read(path).match(EMAIL) ?? []);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.filter((address) => !address.endsWith("exemplo.org"))).toEqual([]);
  });
});
