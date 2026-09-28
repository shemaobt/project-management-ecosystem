import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InviteDescription } from "../../../../types/access";
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
const { InvitationClosed, InvitationOpen } = await import("../ConviteView");
const { createsAccount, readInvitation } = await import("../invitation");
const { joinMessage } = await import("../message");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const INVITE: InviteDescription = {
  status: "pending",
  email: "novo@exemplo.org",
  roleKey: "obtLab",
  accountExists: false,
  regionKeys: ["asia", "oceania"],
};

const render = (element: ReactElement) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const refused = (kind: ApiFailure["kind"], detail: string | null = null): ApiFailure => ({
  kind,
  status: null,
  code: null,
  detail,
});

const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params);

function open(invite: InviteDescription, failure: Parameters<typeof InvitationOpen>[0]["failure"] = null) {
  const reading = readInvitation(invite);
  if (!reading.open) throw new Error("o convite devia estar aberto");
  return render(
    createElement(InvitationOpen, {
      invite,
      role: reading.role,
      app: reading.app,
      working: false,
      failure,
      onSubmit: () => undefined,
    }),
  );
}

describe("o que o convite dá, pelo catálogo do console", () => {
  it("papel, app e regiões saem das nossas chaves — nunca do rótulo do banco", () => {
    const out = open(INVITE);
    expect(out).toContain(
      t("convite_gives", { role: t("role_obtlab"), app: t("acesso_app_shema") }),
    );
    expect(out).toContain(t("continent_asia"));
    expect(out).toContain(t("continent_oceania"));
    expect(out).toContain(t("convite_for_email", { email: INVITE.email }));
  });

  it("o app é deduzido do papel: mesa é do formulário", () => {
    expect(readInvitation({ ...INVITE, roleKey: "mesa", regionKeys: [] })).toEqual({
      open: true,
      role: "mesa",
      app: "resource-request-form",
    });
  });

  it("papel vazio, desconhecido ou o Admin falham fechados", () => {
    for (const roleKey of ["", "lider", "admin", "banana"]) {
      expect(readInvitation({ ...INVITE, roleKey }), roleKey).toEqual({
        open: false,
        reason: "unknownRole",
      });
    }
  });
});

describe("cadastro × entrada", () => {
  it("sem conta, cria ali mesmo: e-mail fixo, nome opcional, senha nova", () => {
    const out = open(INVITE);
    expect(out).toContain(t("convite_signup_submit"));
    expect(out).toContain(t("convite_name"));
    expect(out).toContain('autoComplete="new-password"');
    expect(out).toContain('autoComplete="username" readOnly="" value="novo@exemplo.org"');
  });

  it("com conta, pede só a senha dela", () => {
    const out = open({ ...INVITE, accountExists: true });
    expect(out).toContain(t("convite_signin_submit"));
    expect(out).not.toContain(t("convite_name"));
    expect(out).toContain('autoComplete="current-password"');
  });

  it("se o cadastro passou e o aceite não, a pessoa sabe que a conta existe e passa a entrar", () => {
    const failure = {
      stage: "accept" as const,
      failure: refused("conflict", "This invitation has expired."),
      accountCreated: true,
    };
    expect(createsAccount(INVITE, failure)).toBe(false);
    const out = open(INVITE, failure);
    expect(out).toContain(t("convite_account_created"));
    expect(out).toContain(t("convite_signin_submit"));
  });

  it("um e-mail que já tinha conta vira entrada, não um segundo cadastro", () => {
    const failure = { stage: "auth" as const, failure: refused("conflict"), accountCreated: false };
    expect(createsAccount(INVITE, failure)).toBe(false);
    expect(joinMessage(failure, t)).toBe(t("convite_account_exists"));
  });
});

describe("as leituras da página", () => {
  it("401 é senha errada, 403 no aceite é outro e-mail", () => {
    expect(
      joinMessage({ stage: "auth", failure: refused("unauthorized"), accountCreated: false }, t),
    ).toBe(t("entrar_bad_credentials"));
    expect(
      joinMessage({ stage: "accept", failure: refused("forbidden"), accountCreated: false }, t),
    ).toBe(t("convite_other_email"));
  });

  it("o resto é a frase de sempre", () => {
    expect(
      joinMessage({ stage: "accept", failure: refused("offline"), accountCreated: false }, t),
    ).toBe(t("net_offline"));
  });
});

describe("convite fechado não tem formulário", () => {
  const reasons = ["missing", "notFound", "expired", "used", "revoked", "unknownRole"] as const;

  for (const reason of reasons) {
    it(reason, () => {
      const out = render(createElement(InvitationClosed, { reason }));
      expect(out).not.toContain("<form");
      expect(out).not.toContain('type="password"');
      expect(out).toContain("<h1");
    });
  }

  it("vencido, usado e revogado leem o estado que o servidor manda", () => {
    for (const status of ["expired", "used", "revoked"] as const) {
      expect(readInvitation({ ...INVITE, status })).toEqual({ open: false, reason: status });
    }
  });

  it("o usado aponta para o console; os mortos, para o Admin", () => {
    expect(render(createElement(InvitationClosed, { reason: "used" }))).toContain(
      t("convite_go_console"),
    );
    expect(render(createElement(InvitationClosed, { reason: "expired" }))).toContain(
      t("convite_expired_body"),
    );
  });
});
