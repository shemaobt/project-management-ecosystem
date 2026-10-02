import { describe, expect, it } from "vitest";
import { DEFAULT_METAPHOR } from "../../constants/metaphors";
import { DEFAULT_SORT } from "../../constants/sorting";
import { EMPTY_FILTERS } from "../../stores/filtersStore";
import {
  decodeView,
  encodeAddress,
  encodeView,
  encodeViewToUrl,
  type ViewState,
} from "../filterSerialisation";

/**
 * A place filter never goes into the address (OBT-558): a base or a country typed into the
 * Projetos filters would otherwise sit in the history and in every link shared from the screen.
 * The server's browse still receives it, and an old link that carries one is still read.
 */
const view: ViewState = {
  filters: {
    ...EMPTY_FILTERS,
    team: "YWAM Egypt",
    country: "Egypt",
    vitality: "Vigorosa",
    status: "em-andamento",
  },
  search: "",
  sort: DEFAULT_SORT,
  metaphor: DEFAULT_METAPHOR,
};

describe("o endereço não leva lugar", () => {
  it("base e país ficam fora do endereço; o resto continua", () => {
    const address = encodeAddress(view);

    expect(address.get("team")).toBeNull();
    expect(address.get("country")).toBeNull();
    expect(address.get("vitality")).toBe("Vigorosa");
    expect(address.get("status")).toBe("em-andamento");
  });

  it("o link compartilhado também não leva", () => {
    const link = encodeViewToUrl(view, "/projetos");

    expect(link).not.toContain("Egypt");
    expect(link).toContain("status=em-andamento");
  });

  it("a busca no servidor continua recebendo os dois, ou o filtro não filtraria", () => {
    const query = encodeView(view);

    expect(query.get("team")).toBe("YWAM Egypt");
    expect(query.get("country")).toBe("Egypt");
  });

  it("um link antigo que traz base ainda abre com o filtro", () => {
    const shared = decodeView(new URLSearchParams("team=YWAM%20Egypt&status=em-andamento"));

    expect(shared.filters.team).toBe("YWAM Egypt");
    expect(shared.filters.status).toBe("em-andamento");
  });
});
