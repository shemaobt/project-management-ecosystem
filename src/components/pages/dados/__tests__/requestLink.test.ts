import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IssuedRequestLink, RequestLink } from "../../../../types/request";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { default: i18n } = await import("../../../../i18n");
const { RequestLinkDialogBody } = await import("../RequestLinkDialog");
const { formatDate } = await import("../../../../utils/format");

const FORM = "https://formulario.exemplo.org";

const LINK: RequestLink = {
  id: "l-1",
  email: "pessoa@exemplo.org",
  project_hint: "equipe exemplo, língua exemplo",
  status: "pending",
  expires_at: "2026-11-28T12:00:00+00:00",
  verified_at: null,
  revoked_at: null,
  created_by: "u-admin",
  created_at: "2026-09-29T12:00:00+00:00",
};

const ISSUED: IssuedRequestLink = { ...LINK, token: "token-secreto-uma-vez", code: "004271" };

const noop = () => undefined;

const body = (over: {
  formBase?: string | null;
  issued?: IssuedRequestLink | null;
  links?: readonly RequestLink[] | null;
}) =>
  renderToStaticMarkup(
    createElement(RequestLinkDialogBody, {
      formBase: over.formBase === undefined ? FORM : over.formBase,
      issued: over.issued ?? null,
      issuing: false,
      refusal: null,
      links: over.links === undefined ? [LINK] : over.links,
      linksError: null,
      onIssue: noop,
      onDismissIssued: noop,
      onRevoke: noop,
      onRetry: noop,
    }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a copy diz o que o link dá e por quanto tempo", () => {
  it("antes de emitir: quem recebe, o que abre, o código, e que vence e se revoga", () => {
    const html = body({});
    expect(html).toContain(i18n.t("rr_link_desc"));
    expect(html).toContain(i18n.t("rr_link_guard"));
    expect(html).toContain(i18n.t("rr_link_expiry"));
  });

  it("depois de emitir: a data em que o link vence, lida da resposta do servidor", () => {
    const html = body({ issued: ISSUED });
    expect(html).toContain(
      i18n.t("intake_expires_on", { date: formatDate("2026-11-28", i18n.t("locale")) }),
    );
  });
});

describe("o link e o código aparecem uma vez", () => {
  it("o painel da emissão mostra o endereço público do formulário e o código", () => {
    const html = body({ issued: ISSUED });
    expect(html).toContain(`${FORM}/solicitar/token-secreto-uma-vez`);
    expect(html).toContain("004271");
    expect(html).toContain(i18n.t("rr_link_once"));
  });

  it("fora da emissão — o formulário e a lista — nem o token nem o código aparecem", () => {
    const html = body({ issued: null, links: [{ ...LINK, status: "verified" }] });
    expect(html).not.toContain("token-secreto-uma-vez");
    expect(html).not.toContain("004271");
    expect(html).toContain("<form");
  });

  it("o estado da emissão vive dentro do conteúdo do diálogo, que desmonta ao fechar", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/pages/dados/RequestLinkDialog.tsx"),
      "utf8",
    ).replace(/\s+/gu, "");
    expect(source).toContain("useState<IssuedRequestLink|null>(null)");
    expect(source).toContain("onDismissIssued={()=>setIssued(null)}");
    const content = source.slice(source.indexOf("<DialogContent"));
    expect(content).toContain("<RequestLinkPanelapi={api}formBase={formBase}/>");
  });

  it("só o diálogo lê o token e o código — nenhuma lista, nenhum store, nada no navegador", () => {
    const TEST_FILE = /(?:^|\/)__tests__\//u;
    const walk = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      });
    const shipped = ["src/components", "src/stores", "src/contexts", "src/hooks"]
      .flatMap(walk)
      .map((path) => relative(process.cwd(), join(process.cwd(), path)).split("\\").join("/"))
      .filter((path) => /\.tsx?$/u.test(path) && !TEST_FILE.test(path));
    expect(shipped).toContain("src/components/pages/dados/RequestLinkList.tsx");

    const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
    expect(shipped.filter((path) => read(path).includes("IssuedRequestLink"))).toEqual([
      "src/components/pages/dados/RequestLinkDialog.tsx",
    ]);
    const dados = shipped.filter((path) => path.startsWith("src/components/pages/dados/Request"));
    expect(dados).toHaveLength(3);
    expect(
      dados.filter((path) => /\b(?:localStorage|sessionStorage|indexedDB|persist\()/u.test(read(path))),
    ).toEqual([]);
  });
});

describe("a lista dos links emitidos", () => {
  it("revoga o que ainda abre — aguardando e código confirmado — e não o que já morreu", () => {
    const revocable = body({ links: [LINK, { ...LINK, id: "l-2", status: "verified" }] });
    expect(revocable.match(new RegExp(i18n.t("intake_revoke"), "gu"))).toHaveLength(2);
    expect(revocable).toContain(i18n.t("rr_link_status_verified"));

    const dead = body({
      links: [
        { ...LINK, status: "expired" },
        { ...LINK, id: "l-3", status: "revoked" },
      ],
    });
    expect(dead).not.toContain(i18n.t("intake_revoke"));
    expect(dead).toContain(i18n.t("intake_status_expired"));
    expect(dead).toContain(i18n.t("intake_status_revoked"));
  });

  it("carregando não é lista vazia", () => {
    const loading = body({ links: null });
    expect(loading).toContain('role="status"');
    expect(loading).not.toContain(i18n.t("rr_links_empty"));
    expect(body({ links: [] })).toContain(i18n.t("rr_links_empty"));
  });
});

describe("sem o endereço do formulário não se emite", () => {
  it("o formulário de emissão não aparece, e o aviso diz por quê; a lista continua", () => {
    const html = body({ formBase: null });
    expect(html).not.toContain("<form");
    expect(html).not.toContain(i18n.t("rr_link_issue"));
    expect(html).toContain(i18n.t("rr_form_unavailable", { admin: i18n.t("role_admin") }));
    expect(html).toContain(LINK.email);
  });
});

describe("as duas línguas", () => {
  it("fala inglês por inteiro", async () => {
    await i18n.changeLanguage("en");
    const html = body({ issued: ISSUED });
    expect(html).toContain("Copy it now — the link and the code show here only once.");
    expect(html).toContain("Issued links");
  });
});
