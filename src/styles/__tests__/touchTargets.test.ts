import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox, Radio, RadioGroup } from "../../components/ui";
import { touchTargetInline, touchTargetPseudo } from "../touch";

const EQUIPE_TAB = "src/components/pages/ficha/tabs/equipe";
const peopleField = readFileSync(join(process.cwd(), EQUIPE_TAB, "PeopleField.tsx"), "utf8");
const regionalRoles = readFileSync(join(process.cwd(), EQUIPE_TAB, "RegionalRoles.tsx"), "utf8");
const MIN_TARGET_PX = 24;
const REM_STEP_PX = 4;

function scaleOf(classes: string, pattern: RegExp): number {
  const match = pattern.exec(classes);
  if (!match?.[1]) throw new Error(`classe ausente: ${pattern.source}`);
  return Number(match[1]) * REM_STEP_PX;
}

function removeButtonClasses(): string {
  const start = peopleField.indexOf('aria-label={t("f_people_remove"');
  expect(start).toBeGreaterThan(-1);
  const end = peopleField.indexOf("</button>", start);
  return peopleField.slice(start, end);
}

describe("o × de remover pessoa tem alvo de 24×24 sem mudar o desenho", () => {
  it("o pseudo-elemento transparente leva o botão desenhado a 24 px", () => {
    const drawn = scaleOf(removeButtonClasses(), /\bsize-(\d+(?:\.\d+)?)\b/u);
    const reach = scaleOf(touchTargetPseudo, /\bbefore:-inset-(\d+(?:\.\d+)?)\b/u);

    expect(touchTargetPseudo).toContain("relative");
    expect(touchTargetPseudo).toContain("before:absolute");
    expect(drawn + 2 * reach).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });

  it("o botão usa a constante e não desenha o pseudo-elemento por conta própria", () => {
    expect(removeButtonClasses()).toContain("touchTargetPseudo");
    expect(removeButtonClasses()).not.toMatch(/before:/u);
  });
});

describe("o link Abrir a área Equipe tem altura de alvo de 24 px", () => {
  it("o padding vertical é compensado pela margem negativa, então o texto não sai do lugar", () => {
    const padding = scaleOf(touchTargetInline, /\bpy-(\d+(?:\.\d+)?)\b/u);
    const pull = scaleOf(touchTargetInline, /-my-(\d+(?:\.\d+)?)\b/u);

    expect(pull).toBe(padding);
    expect(touchTargetInline).toContain("inline-block");
  });

  it("o padding cobre o que falta entre a linha de 12 px do texto e os 24 px", () => {
    const padding = scaleOf(touchTargetInline, /\bpy-(\d+(?:\.\d+)?)\b/u);
    const lineHeightOfMicroText = 18.6;

    expect(lineHeightOfMicroText + 2 * padding).toBeGreaterThanOrEqual(
      MIN_TARGET_PX,
    );
  });

  it("o link usa a constante", () => {
    expect(regionalRoles).toContain("touchTargetInline");
  });
});

describe("Checkbox e Radio nascem com rótulo", () => {
  it("o tipo recusa um Checkbox sem rótulo", () => {
    // @ts-expect-error o rótulo é obrigatório no tipo
    createElement(Checkbox, {});
    expect(true).toBe(true);
  });

  it("o tipo recusa um Radio sem rótulo", () => {
    // @ts-expect-error o rótulo é obrigatório no tipo
    createElement(Radio, { value: "a" });
    expect(true).toBe(true);
  });

  it("o rótulo vira o nome acessível do controle", () => {
    const checkbox = renderToStaticMarkup(
      createElement(Checkbox, { label: "Aceito" }),
    );
    const radio = renderToStaticMarkup(
      createElement(
        RadioGroup,
        null,
        createElement(Radio, { value: "a", label: "Opção A" }),
      ),
    );

    expect(checkbox).toContain('aria-label="Aceito"');
    expect(radio).toContain('aria-label="Opção A"');
  });
});
