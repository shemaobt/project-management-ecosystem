import { describe, expect, it } from "vitest";
import { http } from "../client";
import { authAPI, projectsAPI, sessionAPI } from "../endpoints";
import { toApiFailure } from "../errors";
import { accessToken, forgetTokens } from "../tokens";

const BASE = process.env.SHEMA_LIVE_API;

const EMAIL = process.env.SHEMA_LIVE_EMAIL ?? "coord@shema.org";
const PASSWORD = process.env.SHEMA_LIVE_PASSWORD ?? "integracao123";

describe.skipIf(!BASE)("contra o shema-api rodando (SHEMA_LIVE_API)", () => {
  http.defaults.baseURL = `${BASE}/api`;

  it("recusa a sessão sem token, e a recusa é lida como unauthorized", async () => {
    forgetTokens("signedOut");
    expect(await sessionAPI.get().catch(toApiFailure)).toMatchObject({
      kind: "unauthorized",
      status: 401,
    });
  });

  it("senha errada é unauthorized e não deixa meia sessão", async () => {
    expect(
      await authAPI
        .signIn({ email: EMAIL, password: `${PASSWORD}-errada` })
        .catch(toApiFailure),
    ).toMatchObject({ kind: "unauthorized" });
    expect(accessToken()).toBeNull();
  });

  it("entra, guarda o bearer só em memória e lê a sessão do Shemá", async () => {
    const account = await authAPI.signIn({ email: EMAIL, password: PASSWORD });
    expect(account.email).toBe(EMAIL);
    expect(accessToken()).toBeTruthy();

    const session = await sessionAPI.get();
    expect(Object.keys(session).sort()).toEqual(["name", "regionScope", "role"]);
    expect(["globalStrategist", "coordinator", "obtLab", "resourceCircle"]).toContain(
      session.role,
    );
  });

  it("um endpoint que a onda 2 ainda não escreveu é notFound, não queda", async () => {
    expect(await projectsAPI.list().catch(toApiFailure)).toMatchObject({
      kind: "notFound",
      status: 404,
    });
  });

  it("sair apaga o bearer e a sessão volta a ser recusada", async () => {
    await authAPI.signOut();
    expect(accessToken()).toBeNull();
    expect(await sessionAPI.get().catch(toApiFailure)).toMatchObject({
      kind: "unauthorized",
    });
  });
});
