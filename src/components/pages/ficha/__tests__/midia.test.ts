import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

await import("../../../../i18n");
const { AuthProvider } = await import("../../../../contexts/AuthContext");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { MidiaTab } = await import("../tabs/Midia");
const { makeEmptyMediaPhoto } = await import("../../../../utils/media");
const utils = await import("../../../../utils/media");
const { formatDate } = await import("../../../../utils/format");

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

const noop = () => {};

const handle = (values: Values = {}) => ({
  values: { ...makeEmptyProject(), ...values },
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  discard: noop,
});

const render = (element: ReactElement) => renderToStaticMarkup(element);

const view = (values: Values = {}) =>
  render(createElement(MidiaTab, { mode: "ver", draft: handle(values) }));

const form = (values: Values = {}) =>
  render(
    createElement(
      AuthProvider,
      null,
      createElement(MidiaTab, { mode: "editar", draft: handle(values) }),
    ),
  );

const GRANTED = utils.makeMediaAuthorization(
  true,
  "Karina Marinho",
  "2026-08-12",
);
const REFUSED = utils.makeMediaAuthorization(false, "Henok", "2026-08-01");

const PHOTO = {
  ...makeEmptyMediaPhoto(),
  image: { src: "data:image/webp;base64,abc", fileName: "equipe.webp" },
  caption: "Entrega em Porto Velho",
};

describe("MidiaView", () => {
  it("renders the six prototype slots even when the record has no media", () => {
    const html = view();
    expect(html.split("Arraste uma foto aqui").length - 1).toBe(6);
    expect(html).not.toContain("Uso restrito");
    expect(html).not.toContain("Uso autorizado");
  });

  it("shows an undecided item as restricted, with the default spelled out", () => {
    const html = view({ mediaPhotos: [PHOTO] });
    expect(html).toContain("Uso restrito");
    expect(html).toContain("Sem decisão registrada — tratado como uso restrito");
  });

  it("shows who authorized and when", () => {
    const html = view({ mediaPhotos: [{ ...PHOTO, authorization: GRANTED }] });
    expect(html).toContain("Uso autorizado");
    expect(html).toContain(`Karina Marinho · ${formatDate("2026-08-12")}`);
  });

  it("shows a refusal with its evidence, never as authorized", () => {
    const html = view({ mediaPhotos: [{ ...PHOTO, authorization: REFUSED }] });
    expect(html).toContain("Uso restrito");
    expect(html).toContain(`Henok · ${formatDate("2026-08-01")}`);
    expect(html).not.toContain("Uso autorizado");
  });

  it("renders videos with their own authorization state", () => {
    const html = view({
      mediaVideos: [
        { url: "https://youtu.be/abc", caption: "Dedicação", authorization: null },
      ],
    });
    expect(html).toContain("https://www.youtube.com/embed/abc");
    expect(html).toContain("Dedicação");
    expect(html).toContain("Uso restrito");
  });

  it("announces the sensitive-country composition on the tab", () => {
    const html = view({ sensitiveCountry: true });
    expect(html).toContain("a regra mais restritiva vence");
  });
});

describe("MidiaForm", () => {
  it("renders six upload slots with no authorization pre-checked", () => {
    const html = form();
    expect(html.split("Autorizo compartilhar").length - 1).toBe(6);
    expect(html).not.toContain('data-state="checked"');
  });

  it("an item with content but no decision shows the restricted default beside the toggle", () => {
    const html = form({ mediaPhotos: [PHOTO] });
    expect(html).toContain("Sem decisão registrada — tratado como uso restrito");
    expect(html).not.toContain('data-state="checked"');
  });

  it("a granted item shows the checked toggle and its evidence", () => {
    const html = form({ mediaPhotos: [{ ...PHOTO, authorization: GRANTED }] });
    expect(html).toContain('data-state="checked"');
    expect(html).toContain(`Karina Marinho · ${formatDate("2026-08-12")}`);
  });

  it("renders a video row with url, caption, removal and its own toggle", () => {
    const html = form({
      mediaVideos: [
        { url: "https://vimeo.com/9", caption: "", authorization: null },
      ],
    });
    expect(html).toContain("https://vimeo.com/9");
    expect(html).toContain("Remover · Vídeos 1");
    expect(html.split("Autorizo compartilhar").length - 1).toBe(7);
  });

  it("announces the sensitive-country composition where the decision is made", () => {
    const html = form({ sensitiveCountry: true });
    expect(html).toContain("a regra mais restritiva vence");
  });
});

describe("draft media updates", () => {
  it("two images resolving in the same batch both land in the draft", async () => {
    const { useRecordStore } = await import("../../../../stores/recordStore");
    const { photoSlots, withPhotoImage } = utils;
    const recordId = "race-teste";
    const first = { src: "data:image/webp;base64,um", fileName: "um.webp" };
    const second = { src: "data:image/webp;base64,dois", fileName: "dois.webp" };

    const drop = (index: number, image: typeof first) =>
      useRecordStore
        .getState()
        .updateDraftValue(recordId, "mediaPhotos", (current) =>
          photoSlots(current).map((photo, i) =>
            i === index ? withPhotoImage(photo, image) : photo,
          ),
        );

    drop(0, first);
    drop(1, second);

    const photos = useRecordStore.getState().drafts[recordId]?.mediaPhotos;
    expect(photos?.[0]?.image).toEqual(first);
    expect(photos?.[1]?.image).toEqual(second);
    useRecordStore.getState().discardDraft(recordId);
  });
});
