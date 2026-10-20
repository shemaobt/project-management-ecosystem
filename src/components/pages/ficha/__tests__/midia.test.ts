import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FULL_ACCESS } from "../../../../utils/recordAccess";

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
const { AuthProvider } = await import("../../../../contexts/AuthContext");
const { MOCK_SESSION_KEY } = await import("../../../../fixtures/session");
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
  typed: {},
  errors: [],
  errorsFor: () => [],
  place: FULL_ACCESS,
  discard: noop,
});

const render = (element: ReactElement) => renderToStaticMarkup(element);

const view = (values: Values = {}) =>
  render(
    createElement(AuthProvider, null, createElement(MidiaTab, { mode: "ver", draft: handle(values) })),
  );

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

describe("MidiaView — a legenda esvaziada se diz como ocultada (OBT-580, §6.1)", () => {
  const decided = { granted: true, by: "", at: "2026-10-01" };
  const withheld = { ...FULL_ACCESS, withheld: true };
  const viewAs = (place: typeof FULL_ACCESS, values: Values) =>
    render(
      createElement(
        AuthProvider,
        null,
        createElement(MidiaTab, { mode: "ver", draft: { ...handle(values), place } }),
      ),
    );
  const NOTE = () => i18n.t("f_free_text_coordination_only", { regional: "x", admin: "y" }).slice(0, 40);

  it("quem não lê a verdade vê a frase de ocultada no lugar da legenda", () => {
    const markup = viewAs(withheld, { mediaPhotos: [{ image: null, caption: "", authorization: decided }] });
    expect(markup).toContain(NOTE());
  });

  it("a coordenação vê a legenda, e nenhuma frase de ocultada", () => {
    const markup = viewAs(FULL_ACCESS, {
      mediaPhotos: [{ image: null, caption: "A equipe no vale", authorization: decided }],
    });
    expect(markup).toContain("A equipe no vale");
    expect(markup).not.toContain(NOTE());
  });

  it("sem mídia nenhuma, não há o que dizer ocultado", () => {
    expect(viewAs(withheld, {})).not.toContain(NOTE());
  });
});

describe("MidiaView — a foto do Pulso para quem não lê a verdade (OBT-580)", () => {
  it("sem bytes e com a legenda esvaziada, a decisão ainda aparece: autorizada, e quando", () => {
    const markup = view({
      mediaPhotos: [
        { image: null, caption: "", authorization: { granted: true, by: "", at: "2026-10-01" } },
      ],
    });
    expect(markup).toContain(i18n.t("media_auth_yes"));
    expect(markup).toContain(formatDate("2026-10-01"));
  });

  it("um vazio de verdade não ganha decisão nenhuma", () => {
    const markup = view({ mediaPhotos: [makeEmptyMediaPhoto()] });
    expect(markup).not.toContain(i18n.t("media_auth_yes"));
    expect(markup).not.toContain(i18n.t("media_auth_no"));
  });
});

describe("MidiaForm", () => {
  it("renders six upload slots with no authorization pre-checked", () => {
    const html = form();
    expect(html.split(">Autorizo compartilhar<").length - 1).toBe(6);
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
    expect(html.split(">Autorizo compartilhar<").length - 1).toBe(7);
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

/** The tab for a saved record — `p1` — whose photos came from the server. */
const viewSaved = (values: Values) => {
  const draft = handle(values);
  return render(
    createElement(
      AuthProvider,
      null,
      createElement(MidiaTab, {
        mode: "ver",
        draft: {
          ...draft,
          values: { ...draft.values, id: "p1", readAs: draft.values.readAs ?? "coordination" },
        },
      }),
    ),
  );
};

describe("MidiaView — a retirada pelo id (OBT-582)", () => {
  const serverPhoto = {
    id: "item-1",
    image: null,
    caption: "A equipe no vale",
    authorization: { granted: true, by: "Fresia", at: "2026-10-01" },
  };

  it("o coordenador vê o botão de retirar numa foto autorizada do servidor", () => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    const markup = viewSaved({ mediaPhotos: [serverPhoto] });
    expect(markup).toContain(i18n.t("media_withdraw"));
  });

  it("OBT Lab e Resource Circle não veem o botão", () => {
    for (const role of ["obtLab", "resourceCircle"]) {
      localStorage.setItem(MOCK_SESSION_KEY, role);
      expect(viewSaved({ mediaPhotos: [serverPhoto] }), role).not.toContain(i18n.t("media_withdraw"));
    }
  });

  it("depois de retirada, nem botão nem pedido de link: o slot volta a ser vazio", () => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    const markup = viewSaved({
      mediaPhotos: [{ ...serverPhoto, authorization: { granted: false, by: "", at: "2026-10-09" } }],
    });
    expect(markup).not.toContain(i18n.t("media_withdraw"));
    expect(markup).toContain(i18n.t("media_auth_no"));
  });
});

describe("MidiaView — OBT Lab e Resource Circle em sensível não montam o pedido da foto (OBT-582)", () => {
  const serverPhoto = {
    id: "item-1",
    image: null,
    caption: "",
    authorization: { granted: true, by: "", at: "2026-10-01" },
  };
  const LINK = 'data-photo-link=""';

  it("a coordenação monta o MediaPhotoImage; OBT Lab e Resource Circle não", () => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    const as = (readAs: "coordination" | "other" | "trusted") =>
      viewSaved({ sensitiveCountry: true, readAs, mediaPhotos: [serverPhoto] });
    expect(as("coordination")).toContain(LINK);
    expect(as("other")).not.toContain(LINK);
    expect(as("trusted")).not.toContain(LINK);
  });

  it("fora de sensível, o pedido é montado para quem lê como other", () => {
    expect(viewSaved({ sensitiveCountry: false, readAs: "other", mediaPhotos: [serverPhoto] })).toContain(LINK);
  });
});

describe("MidiaView — depois da retirada, a decisão na tela é a do servidor (OBT-582, review)", () => {
  const granted = { granted: true, by: "Fresia", at: "2026-10-01" };
  const refused = { granted: false, by: "", at: "2026-10-13" };
  const photo = (authorization: typeof granted) => ({
    id: "item-1",
    image: null,
    caption: "A equipe no vale",
    authorization,
  });

  /** A draft that still holds the photo as authorized, over a record the server re-read refused. */
  const afterWithdrawal = () => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    const draft = handle({ mediaPhotos: [photo(granted)] });
    const saved = { ...draft.values, id: "p1", readAs: "coordination" as const, mediaPhotos: [photo(refused)] };
    return render(
      createElement(
        AuthProvider,
        null,
        createElement(MidiaTab, {
          mode: "ver",
          draft: { ...draft, values: { ...draft.values, id: "p1", readAs: "coordination" }, saved },
        }),
      ),
    );
  };

  it("um rascunho com a foto autorizada não repinta o granted sobre o registro relido", () => {
    const markup = afterWithdrawal();
    expect(markup).toContain(i18n.t("media_auth_no"));
    expect(markup).not.toContain(i18n.t("media_auth_yes"));
    expect(markup).not.toContain(i18n.t("media_withdraw"));
    expect(markup).not.toContain('data-photo-link=""');
  });
});

describe("MidiaView — o botão de retirar segue a leitura da ficha, não só o papel (OBT-582, review)", () => {
  const serverPhoto = {
    id: "item-1",
    image: null,
    caption: "",
    authorization: { granted: true, by: "", at: "2026-10-01" },
  };

  it("coordenador da região (coordination) vê; de outra região (other) ou trusted, não", () => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    for (const sensitiveCountry of [true, false]) {
      const as = (readAs: "coordination" | "other" | "trusted") =>
        viewSaved({ sensitiveCountry, readAs, mediaPhotos: [serverPhoto] });
      expect(as("coordination"), `sensível=${sensitiveCountry}`).toContain(i18n.t("media_withdraw"));
      expect(as("other"), `sensível=${sensitiveCountry}`).not.toContain(i18n.t("media_withdraw"));
      expect(as("trusted"), `sensível=${sensitiveCountry}`).not.toContain(i18n.t("media_withdraw"));
    }
  });
});

describe("MidiaView — a decisão do servidor é da foto, não do slot (OBT-582, review; FE-27)", () => {
  const granted = { granted: true, by: "Fresia", at: "2026-10-01" };
  const serverPhoto = { id: "item-1", image: null, caption: "A equipe no vale", authorization: granted };
  const LINK = 'data-photo-link=""';

  /** The tab over a saved record holding `serverPhoto`, with `draftPhoto` in the draft. */
  // The coordinator persona writes in South America (OBT-593), so the record is placed there.
  const over = (draftPhoto: Record<string, unknown>, location = "Peru") => {
    localStorage.setItem(MOCK_SESSION_KEY, "coordinator");
    const draft = handle({ mediaPhotos: [draftPhoto as never] });
    const saved = {
      ...draft.values,
      id: "p1",
      location,
      readAs: "coordination" as const,
      mediaPhotos: [serverPhoto],
    };
    return render(
      createElement(
        AuthProvider,
        null,
        createElement(MidiaTab, {
          mode: "ver",
          draft: { ...draft, values: { ...draft.values, id: "p1", readAs: "coordination" }, saved },
        }),
      ),
    );
  };

  it("um arquivo novo no slot de uma foto do servidor não herda o 'Uso autorizado' antigo", () => {
    const markup = over({
      id: "item-1",
      image: { src: "data:image/webp;base64,NOVA", fileName: "nova.webp" },
      caption: "A equipe no vale",
      authorization: null,
    });
    expect(markup).toContain("data:image/webp;base64,NOVA");
    expect(markup).not.toContain(i18n.t("media_auth_yes"));
    expect(markup).not.toContain("Fresia");
    expect(markup).not.toContain(i18n.t("media_withdraw"));
    expect(markup).not.toContain(LINK);
  });

  it("a foto do servidor sem arquivo novo segue a decisão do registro", () => {
    const markup = over({ ...serverPhoto, authorization: null });
    expect(markup).toContain(i18n.t("media_auth_yes"));
    expect(markup).toContain(i18n.t("media_withdraw"));
    expect(markup).toContain(LINK);
  });

  it("fora da região onde a coordenação escreve, a retirada não aparece (OBT-593)", () => {
    const markup = over({ ...serverPhoto, authorization: null }, "India");
    expect(markup).toContain(i18n.t("media_auth_yes"));
    expect(markup).not.toContain(i18n.t("media_withdraw"));
  });

  it("uma foto SEM id é deste aparelho e segue o rascunho, mesmo com o registro dizendo outra coisa", () => {
    const markup = over({
      image: { src: "data:image/webp;base64,LOCAL", fileName: "local.webp" },
      caption: "Só aqui",
      authorization: { granted: false, by: "", at: "2026-10-12" },
    });
    expect(markup).toContain("data:image/webp;base64,LOCAL");
    expect(markup).toContain(i18n.t("media_auth_no"));
    expect(markup).not.toContain(i18n.t("media_withdraw"));
    expect(markup).not.toContain(LINK);
  });
});

describe("MidiaForm — a foto do servidor mostra a decisão só leitura (OBT-584)", () => {
  const serverPhoto = {
    id: "item-1",
    image: null,
    caption: "A equipe no vale",
    authorization: { granted: true, by: "Fresia", at: "2026-10-01" },
  };
  const BOX = ">Autorizo compartilhar<";

  /** The form over a saved record holding `serverPhoto`, with `draftPhoto` in the draft's first slot. */
  const formOver = (draftPhoto: Record<string, unknown>) => {
    const draft = handle({ mediaPhotos: [draftPhoto as never] });
    const saved = { ...draft.values, id: "p1", mediaPhotos: [serverPhoto] };
    return render(
      createElement(
        AuthProvider,
        null,
        createElement(MidiaTab, {
          mode: "editar",
          draft: { ...draft, values: { ...draft.values, id: "p1" }, saved },
        }),
      ),
    );
  };

  it("sem caixa para a foto do servidor: estado, autor e data do registro, e as outras cinco seguem com caixa", () => {
    const html = formOver(serverPhoto);
    expect(html.split(BOX).length - 1).toBe(5);
    expect(html).toContain(i18n.t("media_auth_yes"));
    expect(html).toContain(`Fresia · ${formatDate("2026-10-01")}`);
  });

  it("um rascunho que desmarcou a foto do servidor não muda o que se lê: a decisão é a do registro", () => {
    const html = formOver({ ...serverPhoto, authorization: { granted: false, by: "X", at: "2026-10-14" } });
    expect(html).toContain(i18n.t("media_auth_yes"));
    expect(html.split(BOX).length - 1).toBe(5);
  });

  it("um arquivo novo num slot do servidor é deste aparelho: volta a ter a caixa, sem a decisão antiga", () => {
    const html = formOver({
      id: "item-1",
      image: { src: "data:image/webp;base64,NOVA", fileName: "nova.webp" },
      caption: "A equipe no vale",
      authorization: null,
    });
    expect(html.split(BOX).length - 1).toBe(6);
    expect(html).not.toContain(i18n.t("media_auth_yes"));
    expect(html).not.toContain("Fresia");
  });

  it("o arquivo novo removido devolve o slot à foto do servidor, de novo só leitura", () => {
    const html = formOver({ id: "item-1", image: null, caption: "A equipe no vale", authorization: null });
    expect(html.split(BOX).length - 1).toBe(5);
    expect(html).toContain(i18n.t("media_auth_yes"));
  });

  it("sem registro salvo, nada é do servidor: a caixa fica, mesmo com id", () => {
    const draft = handle({ mediaPhotos: [serverPhoto as never] });
    const html = render(
      createElement(
        AuthProvider,
        null,
        createElement(MidiaTab, { mode: "editar", draft: { ...draft, values: { ...draft.values, id: "p1" } } }),
      ),
    );
    expect(html.split(BOX).length - 1).toBe(6);
  });

  it("a foto local, sem id, continua com a caixa editável", () => {
    const html = form({ mediaPhotos: [{ ...PHOTO, authorization: GRANTED }] });
    expect(html.split(BOX).length - 1).toBe(6);
    expect(html).toContain('data-state="checked"');
  });
});
