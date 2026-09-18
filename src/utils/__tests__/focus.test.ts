import { describe, expect, it } from "vitest";
import {
  CONTENT_ANCHOR_ID,
  focusIsLost,
  rescueFocus,
  type FocusHost,
} from "../focus";

function host(
  active: object | null,
  anchor: { focus: () => void } | null,
): { host: FocusHost; body: object } {
  const body = { tag: "body" };
  return {
    body,
    host: {
      activeElement: active,
      body,
      anchor: () => anchor,
    },
  };
}

function spyAnchor() {
  const calls: { preventScroll?: boolean }[] = [];
  return {
    calls,
    anchor: {
      focus: (options?: { preventScroll?: boolean }) => {
        calls.push(options ?? {});
      },
    },
  };
}

describe("o foco depois que um modal fecha", () => {
  it("o gatilho sobreviveu: Radix devolveu o foco e nada mais acontece", () => {
    const trigger = { tag: "button" };
    const spy = spyAnchor();
    const { host: subject } = host(trigger, spy.anchor);

    expect(focusIsLost(subject)).toBe(false);
    expect(rescueFocus(subject)).toBe(false);
    expect(spy.calls).toEqual([]);
  });

  it("o gatilho desmontou: o foco caiu no body e o conteúdo o recolhe", () => {
    const spy = spyAnchor();
    const { host: subject, body } = host(null, spy.anchor);
    const landedOnBody: FocusHost = { ...subject, activeElement: body };

    expect(focusIsLost(landedOnBody)).toBe(true);
    expect(rescueFocus(landedOnBody)).toBe(true);
    expect(spy.calls).toEqual([{ preventScroll: true }]);
  });

  it("o foco em lugar nenhum é o mesmo caso que o foco no body", () => {
    const spy = spyAnchor();
    const { host: subject } = host(null, spy.anchor);

    expect(focusIsLost(subject)).toBe(true);
    expect(rescueFocus(subject)).toBe(true);
    expect(spy.calls).toHaveLength(1);
  });

  it("sem âncora de conteúdo o resgate não inventa um destino", () => {
    const { host: subject } = host(null, null);

    expect(rescueFocus(subject)).toBe(false);
  });

  it("o resgate não rola a página: quem lê com teclado escolhe quando se mover", () => {
    const spy = spyAnchor();
    const { host: subject } = host(null, spy.anchor);

    rescueFocus(subject);

    expect(spy.calls[0].preventScroll).toBe(true);
  });

  it("a âncora tem um nome só, e é o que o skip link aponta", () => {
    expect(CONTENT_ANCHOR_ID).toBe("conteudo");
  });
});
