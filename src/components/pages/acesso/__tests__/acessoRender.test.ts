import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GrantChange, OpenInvite, SentInvite } from "../../../../types/access";
import type { ApiFailure } from "../../../../types/session";

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
const { UNKNOWN_VOCABULARY } = await import("../../../../services/api");
const { PersonPanel } = await import("../PersonPanel");
const { PersonLookupState } = await import("../PersonSection");
const { RefusalNote } = await import("../RefusalNote");
const { RegionPicker } = await import("../RegionPicker");
const { InvitesList, SentInvitePanel } = await import("../InvitesSection");
const { InviteForm } = await import("../InviteForm");
const { HistoryList } = await import("../HistorySection");
const { RosterView } = await import("../MembershipSection");
const { ACCOUNT } = await import("./stubs");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const render = (element: ReactElement) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const escaped = (text: string) => text.replace(/'/gu, "&#x27;");

const noop = () => undefined;

const refused = (
  kind: ApiFailure["kind"],
  status: number | null,
  detail: string | null,
  code: string | null = null,
): ApiFailure => ({ kind, status, detail, code });

function panel(over: Partial<Parameters<typeof PersonPanel>[0]> = {}) {
  return render(
    createElement(PersonPanel, {
      account: ACCOUNT,
      acting: null,
      refusal: null,
      editing: null,
      onGrant: noop,
      onRevoke: noop,
      onEditRegions: noop,
      onRegionsChange: noop,
      onSubmitRegions: noop,
      onCancelRegions: noop,
      ...over,
    }),
  );
}

describe("a pessoa — papéis por app e regiões", () => {
  it("mostra os papéis dos dois apps, o que tem e o que não tem, nos dois canais", () => {
    const out = panel();
    expect(out).toContain(i18n.t("acesso_app_shema"));
    expect(out).toContain(i18n.t("acesso_app_form"));
    expect(out).toContain(i18n.t("role_coordinator"));
    expect(out).toContain(i18n.t("role_mesa"));
    expect(out).toContain(i18n.t("acesso_role_held"));
    expect(out).toContain(i18n.t("acesso_role_not_held"));
    expect(out).toContain(i18n.t("continent_africa"));
  });

  it("o Admin diz que vale para os dois apps", () => {
    expect(panel()).toContain(i18n.t("acesso_admin_both_apps"));
  });

  it("conceder regional abre o seletor: sem região, o botão fica desligado e a tela diz por quê", () => {
    const out = panel({ editing: { role: "obtLab", regions: [] } });
    expect(out).toContain(i18n.t("acesso_regions_required"));
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Conceder com estas regiões<\/button>/u);
    expect(out).toContain('aria-label="Sobre papéis regionais"');
  });

  it("com uma região marcada, o mesmo botão libera", () => {
    const out = panel({ editing: { role: "obtLab", regions: ["asia"] } });
    expect(out).not.toContain(i18n.t("acesso_regions_required"));
    expect(out).toMatch(/<button[^>]*>Conceder com estas regiões<\/button>/u);
    expect(out).not.toMatch(/disabled=""[^>]*>Conceder com estas regiões/u);
  });
});

describe("o seletor de regiões", () => {
  it("são as sete regiões do organograma, como caixas de marcar, e a regra aberta nomeia os três papéis regionais", () => {
    const out = render(
      createElement(RegionPicker, {
        legend: "Regiões",
        selected: ["africa"],
        onChange: noop,
        ruleOpen: true,
      }),
    );
    expect(out.match(/role="checkbox"/gu)).toHaveLength(7);
    expect(out).toContain("<fieldset");
    expect(out).toContain(i18n.t("acesso_regions_count", { count: 1 }));
    for (const key of ["role_coordinator", "role_obtlab", "role_resource"]) {
      expect(out).toContain(i18n.t(key));
    }
  });
});

describe("a recusa é a frase do servidor", () => {
  const cases: [string, ApiFailure][] = [
    ["regional sem região (422)", refused("invalid", 422, "'coordinator' is a regional role: grant it with at least one region.")],
    ["mesa × Gestor (409)", refused("conflict", 409, "'mesa' and 'gestor' are mutually exclusive: revoke 'gestor' before granting 'mesa'.")],
    ["a si mesmo (400)", refused("invalid", 400, "You cannot grant a role to yourself.")],
    ["Admin em um app só (403)", refused("forbidden", 403, "The admin role is not held in 'resource-request-form'.")],
  ];

  for (const [name, failure] of cases) {
    it(name, () => {
      const out = render(createElement(RefusalNote, { failure }));
      expect(out).toContain(i18n.t("acesso_server_refused"));
      expect(out).toContain(`<span lang="en">${escaped(failure.detail ?? "")}</span>`);
      expect(out).toContain('role="alert"');
    });
  }

  it("sem frase do servidor, fala o console — e nunca com a introdução de recusa", () => {
    const out = render(createElement(RefusalNote, { failure: refused("offline", null, null) }));
    expect(out).toContain(i18n.t("net_offline"));
    expect(out).not.toContain(i18n.t("acesso_server_refused"));
  });

  it("um vocabulário que o console não conhece diz que o console está atrás da API", () => {
    const out = render(
      createElement(RefusalNote, {
        failure: refused("invalid", null, null, UNKNOWN_VOCABULARY),
      }),
    );
    expect(out).toContain(escaped(i18n.t("entrar_unknown_vocabulary")));
  });

  it("a recusa aparece na linha do papel que a causou", () => {
    const out = panel({
      refusal: {
        row: "resource-request-form:mesa",
        failure: refused("conflict", 409, "mesa and gestor are exclusive"),
      },
    });
    expect(out).toContain("mesa and gestor are exclusive");
  });
});

describe("a busca", () => {
  it("nenhuma conta com o e-mail é um estado guiado com o convite, não uma recusa", () => {
    const out = render(
      createElement(PersonLookupState, {
        lookup: { kind: "none", email: "ninguem@exemplo.org" },
        onInvite: noop,
      }),
    );
    expect(out).toContain(i18n.t("acesso_no_account", { email: "ninguem@exemplo.org" }));
    expect(out).toContain(i18n.t("acesso_invite_this"));
    expect(out).not.toContain(i18n.t("acesso_server_refused"));
  });
});

const INVITE: OpenInvite = {
  id: "i-1",
  email: "novo@exemplo.org",
  appKey: "shema",
  roleKey: "obtLab",
  regionKeys: ["asia"],
  status: "pending",
  createdAt: "2026-09-27T10:00:00Z",
  expiresAt: "2026-10-04T10:00:00Z",
  createdBy: "u-1",
};

const SENT: SentInvite = {
  ...INVITE,
  inviteUrl: "https://pme.exemplo.org/convite?token=segredo-uma-vez",
  emailSent: true,
};

describe("o convite", () => {
  it("o link aparece uma vez, com copiar, e a tela diz que o e-mail saiu", () => {
    const out = render(createElement(SentInvitePanel, { sent: SENT, onDismiss: noop }));
    expect(out).toContain(SENT.inviteUrl);
    expect(out).toContain(i18n.t("link_copy"));
    expect(out).toContain(i18n.t("acesso_invite_once"));
    expect(out).toContain(i18n.t("acesso_invite_email_sent", { email: SENT.email }));
  });

  it("e diz quando o e-mail não saiu", () => {
    const out = render(
      createElement(SentInvitePanel, { sent: { ...SENT, emailSent: false }, onDismiss: noop }),
    );
    expect(out).toContain(i18n.t("acesso_invite_email_not_sent"));
  });

  it("a lista nunca mostra o link — nem se o objeto o trouxer", () => {
    const out = render(
      createElement(InvitesList, {
        invites: [SENT],
        error: null,
        onRevoke: noop,
        onRetry: noop,
      }),
    );
    expect(out).toContain(SENT.email);
    expect(out).not.toContain("segredo-uma-vez");
  });

  it("revogar só existe para o pendente; os outros mostram o estado em texto", () => {
    const out = render(
      createElement(InvitesList, {
        invites: [
          INVITE,
          { ...INVITE, id: "i-2", status: "expired" },
          { ...INVITE, id: "i-3", status: "revoked" },
        ],
        error: null,
        onRevoke: noop,
        onRetry: noop,
      }),
    );
    expect(out.match(/>Revogar<\/button>/gu)).toHaveLength(1);
    expect(out).toContain(i18n.t("intake_status_expired"));
    expect(out).toContain(i18n.t("intake_status_revoked"));
    expect(out).toContain(i18n.t("continent_asia"));
  });

  it("carregando não é vazio", () => {
    const loading = render(
      createElement(InvitesList, { invites: null, error: null, onRevoke: noop, onRetry: noop }),
    );
    expect(loading).toContain('role="status"');
    expect(loading).not.toContain(i18n.t("acesso_invites_empty"));
  });

  it("o formulário não oferece o Admin", () => {
    const out = render(
      createElement(InviteForm, {
        initialEmail: "",
        sending: false,
        refusal: null,
        onSubmit: noop,
      }),
    );
    expect(out).not.toContain(`>${i18n.t("role_admin")}<`);
    expect(out).toContain(i18n.t("acesso_invite_no_admin"));
  });

  it("com o e-mail já preenchido, nenhum papel vem marcado e o envio fica travado", () => {
    const out = render(
      createElement(InviteForm, {
        initialEmail: "pessoa@exemplo.org",
        sending: false,
        refusal: null,
        onSubmit: noop,
      }),
    );
    const roles = out.match(/<button[^>]*id="[^"]*-role-[^"]*"[^>]*>/gu) ?? [];
    expect(roles.length).toBeGreaterThan(0);
    for (const radio of roles) expect(radio).toContain('aria-checked="false"');
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/u);
  });
});

const CHANGE: GrantChange = {
  action: "granted",
  at: "2026-09-27T12:00:00Z",
  appKey: "shema",
  roleKey: "obtLab",
  regionKey: null,
  userId: "u-9",
  userEmail: "pessoa@exemplo.org",
  userName: "Pessoa Exemplo",
  actorId: "u-1",
  actorEmail: "admin@exemplo.org",
  actorName: "Admin Exemplo",
};

describe("o histórico", () => {
  it("cada entrada diz quem, o quê, a quem e quando", () => {
    const out = render(
      createElement(HistoryList, {
        changes: [
          CHANGE,
          { ...CHANGE, action: "revoked", roleKey: null, regionKey: "africa", actorId: null, actorEmail: null, actorName: null },
        ],
        error: null,
        shown: 30,
        onMore: noop,
        onRetry: noop,
      }),
    );
    expect(out).toContain(
      i18n.t("acesso_history_role_granted", {
        actor: "Admin Exemplo",
        role: i18n.t("role_obtlab"),
        app: i18n.t("acesso_app_shema"),
        person: "Pessoa Exemplo",
      }),
    );
    expect(out).toContain(
      i18n.t("acesso_history_region_revoked_anon", {
        region: i18n.t("continent_africa"),
        person: "Pessoa Exemplo",
      }),
    );
    expect(out).toContain("2026");
  });

  it("mostra trinta por vez", () => {
    const many = Array.from({ length: 45 }, (_, index) => ({ ...CHANGE, userId: `u-${index}` }));
    const out = render(
      createElement(HistoryList, { changes: many, error: null, shown: 30, onMore: noop, onRetry: noop }),
    );
    expect(out.match(/<li /gu)).toHaveLength(30);
    expect(out).toContain(i18n.t("load_more"));
  });
});

describe("os membros do projeto", () => {
  const members = [{ userId: "u-9", name: "Pessoa Exemplo", role: "equipe" as const, addedAt: "2026-09-20" }];

  it("quem é membro pode sair, e a tela mostra o mesmo rol da aba Equipe", () => {
    const out = render(
      createElement(RosterView, {
        person: "Pessoa Exemplo",
        personId: "u-9",
        members,
        error: null,
        busy: false,
        refusal: null,
        onAdd: noop,
        onRemove: noop,
      }),
    );
    expect(out).toContain(i18n.t("acesso_member_remove"));
    expect(out).toContain(i18n.t("acesso_members_same_list"));
    expect(out).not.toContain(i18n.t("f_members_hint"));
  });

  it("quem não é pode entrar", () => {
    const out = render(
      createElement(RosterView, {
        person: "Outra Pessoa",
        personId: "u-2",
        members,
        error: null,
        busy: false,
        refusal: null,
        onAdd: noop,
        onRemove: noop,
      }),
    );
    expect(out).toContain(i18n.t("acesso_member_not", { person: "Outra Pessoa" }));
    expect(out).toContain(i18n.t("acesso_member_add"));
  });

  it("enquanto o rol carrega, não há botão de pôr nem de tirar", () => {
    const out = render(
      createElement(RosterView, {
        person: "Pessoa Exemplo",
        personId: "u-9",
        members: null,
        error: null,
        busy: false,
        refusal: null,
        onAdd: noop,
        onRemove: noop,
      }),
    );
    expect(out).not.toContain(i18n.t("acesso_member_add"));
    expect(out).not.toContain(i18n.t("acesso_member_remove"));
  });
});
