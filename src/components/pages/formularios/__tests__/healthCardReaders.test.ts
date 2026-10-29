import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { FormulariosView } = await import("..");
const { canReadHealth, canWriteHealth } = await import("../../../../utils/access");
const { readsReporting } = await import("../../../../utils/forms");
const { formatDate } = await import("../../../../utils/format");
const { ROLE_DEFINITIONS, SESSION_ROLES } = await import("../../../../constants/roles");

type Project = ReturnType<typeof createEmptyProject>;
type SessionRole = import("../../../../types/session").SessionRole;
type ReceivedSubmission = import("../../../../types/forms").ReceivedSubmission;

const NOW = new Date(2026, 4, 14);
const ASSESSED_ON = "2026-05-10";
const QUARTER_CLOSES = "2026-06-30";

const project = (over: Partial<Project> = {}): Project => ({
  ...createEmptyProject("kadiweu"),
  languageName: "Kadiwéu",
  location: "Brazil",
  team: "YWAM Aurora",
  lastUpdated: "2026-05-10",
  ...over,
});

/** The project as a health reader is handed it: assessed inside this quarter. */
const assessed = () =>
  project({
    healthEmotional: "boa",
    healthRelational: "atencao",
    healthSpiritual: "boa",
    healthPhysical: "boa",
    healthAssessmentDate: ASSESSED_ON,
  });

/**
 * The same project as the server hands it to a reader outside the health readers
 * (shema-api `health_as_read`): every health field as on a project nobody assessed.
 */
const asHandedToTheAdmin = () => project();

const returnedPulse = (): ReceivedSubmission => ({
  id: "kadiweu-2026-05-10",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "",
  submittedBy: "",
  receivedAt: "2026-05-10",
  definitionVersion: 1,
  appliedAt: null,
});

/** The screen as `FormulariosPage` mounts it for these roles. */
const viewAs = (
  roles: readonly SessionRole[],
  projects: Project[],
  submissions: ReceivedSubmission[] = [returnedPulse()],
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(FormulariosView, {
        projects,
        submissions,
        now: NOW,
        readsHealth: canReadHealth(roles),
        writesHealth: canWriteHealth(roles),
        writeRegionScope: undefined,
      }),
    ),
  );

/** As `renderToStaticMarkup` writes text: the expected copy has to be escaped the same way. */
const html = (text: string) =>
  text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#x27;");

/**
 * The innermost `<section>` whose heading is the form's title — one form's card, never the page
 * around it nor the Pulse's cycle and pending blocks, which name the Pulse too.
 */
function cardOf(markup: string, titleKey: string): string {
  const heading = `>${html(i18n.t(titleKey))}</h2>`;
  const cards = markup.match(/<section\b(?:(?!<section\b)[\s\S])*?<\/section>/gu) ?? [];
  const found = cards.filter((card) => card.includes(heading));
  expect(found, titleKey).toHaveLength(1);
  return found[0];
}

const health = (markup: string) => cardOf(markup, "forms_health_title");
const pulse = (markup: string) => cardOf(markup, "forms_pulse_title");

const readersSentence = () =>
  html(i18n.t("forms_health_readers_only", {
    coordinator: i18n.t(ROLE_DEFINITIONS.coordinator.labelKey),
    obtLab: i18n.t(ROLE_DEFINITIONS.obtLab.labelKey),
    resourceCircle: i18n.t(ROLE_DEFINITIONS.resourceCircle.labelKey),
  }));

const STATE_KEYS = ["forms_reported", "forms_awaiting", "forms_never", "forms_never_reported"];

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o cartão de Saúde só diz o estado a quem lê a saúde (OBT-660)", () => {
  it("o Admin, a quem o servidor entrega a saúde vazia, não lê “Nunca reportou” nem “Sem registro” no cartão de Saúde", () => {
    const card = health(viewAs(["admin"], [asHandedToTheAdmin()]));

    for (const key of STATE_KEYS) expect(card, key).not.toContain(i18n.t(key));
    expect(card).not.toContain(i18n.t("forms_period_ends", { date: formatDate(QUARTER_CLOSES) }));
  });

  it("no lugar do estado, o Admin lê quem lê a saúde — e não vê o botão da avaliação", () => {
    const card = health(viewAs(["admin"], [asHandedToTheAdmin()]));

    expect(card).toContain(readersSentence());
    for (const role of ["coordinator", "obtLab", "resourceCircle"] as const) {
      expect(card).toContain(i18n.t(ROLE_DEFINITIONS[role].labelKey));
    }
    expect(card).not.toContain(i18n.t("forms_open_health"));
  });

  it("em inglês, o Admin lê a mesma frase em inglês", async () => {
    await i18n.changeLanguage("en");
    const card = health(viewAs(["admin"], [asHandedToTheAdmin()]));

    expect(card).toContain(readersSentence());
    expect(card).not.toContain(i18n.t("forms_never"));
  });

  it("o Admin com a saúde em mãos ainda não lê um estado — a regra é o papel, não o dado", () => {
    const card = health(viewAs(["admin"], [assessed()]));

    expect(card).toContain(readersSentence());
    expect(card).not.toContain(i18n.t("forms_reported"));
  });

  it("o Resource Circle lê a saúde (OBT-571) e vê o estado real: “Reportou neste período”, sem a frase e sem o botão", () => {
    const card = health(viewAs(["resourceCircle"], [assessed()]));

    expect(card).toContain(i18n.t("forms_reported"));
    expect(card).toContain(i18n.t("forms_last_report", { date: formatDate(ASSESSED_ON) }));
    expect(card).not.toContain(readersSentence());
    expect(card).not.toContain(i18n.t("forms_open_health"));
  });

  it("o Admin que também tem um papel que lê a saúde volta a ver o estado", () => {
    const card = health(viewAs(["admin", "resourceCircle"], [assessed()]));

    expect(card).toContain(i18n.t("forms_reported"));
    expect(card).not.toContain(readersSentence());
  });

  it("para quem lê a saúde, um projeto nunca avaliado continua “Nunca reportou · Sem registro”", () => {
    const card = health(viewAs(["coordinator"], [asHandedToTheAdmin()]));

    expect(card).toContain(i18n.t("forms_never"));
    expect(card).toContain(i18n.t("forms_never_reported"));
    expect(card).not.toContain(readersSentence());
  });

  it("o cartão do Pulso não muda para o Admin: o estado dele vem do arquivo, não da saúde", () => {
    const card = pulse(viewAs(["admin"], [asHandedToTheAdmin()]));

    expect(card).toContain(i18n.t("forms_reported"));
    expect(card).not.toContain(readersSentence());
  });

  it("a frase nomeia exatamente quem lê a saúde — os papéis que canReadHealth aceita", () => {
    expect(SESSION_ROLES.filter((role) => canReadHealth([role]))).toEqual([
      "coordinator",
      "obtLab",
      "resourceCircle",
    ]);
  });

  it("readsReporting: o estado da Avaliação é de quem lê a saúde; o do Pulso, de todo leitor", () => {
    expect(readsReporting("health", false)).toBe(false);
    expect(readsReporting("health", true)).toBe(true);
    expect(readsReporting("pulso", false)).toBe(true);
    expect(readsReporting("pulso", true)).toBe(true);
  });
});
