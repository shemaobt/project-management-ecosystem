export const CONTENT_ANCHOR_ID = "conteudo";

interface FocusableAnchor {
  focus: (options?: { preventScroll?: boolean }) => void;
}

export interface FocusHost {
  activeElement: object | null;
  body: object;
  anchor: () => FocusableAnchor | null;
}

export function focusIsLost(host: FocusHost): boolean {
  return host.activeElement === null || host.activeElement === host.body;
}

export function rescueFocus(host: FocusHost): boolean {
  if (!focusIsLost(host)) return false;
  const anchor = host.anchor();
  if (!anchor) return false;
  anchor.focus({ preventScroll: true });
  return true;
}

function documentHost(doc: Document): FocusHost {
  return {
    activeElement: doc.activeElement,
    body: doc.body,
    anchor: () => doc.getElementById(CONTENT_ANCHOR_ID),
  };
}

/**
 * Closing the ficha goes back to the list, and the list is a new mount: the card that opened
 * the ficha no longer exists to take focus back, and the rescue above lands at the start of
 * `main` — a reader who was on the third card starts over (OBT-621, heard in Orca). So the
 * close carries the record's id in the navigation state, and Projetos hands focus back to
 * that card once it renders. A card not on the page — filtered out, or past *Mostrar mais* —
 * leaves the rescue where it is.
 */
export const RETURN_FOCUS_KEY = "devolverFocoA";

export function returnFocusState(recordId: string): Record<string, string> {
  return { [RETURN_FOCUS_KEY]: recordId };
}

export function returnFocusTarget(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  if (!(RETURN_FOCUS_KEY in state)) return null;
  const target = state[RETURN_FOCUS_KEY];
  return typeof target === "string" && target !== "" ? target : null;
}

export function focusCardOf(doc: Document, recordId: string): boolean {
  const card = doc.querySelector<HTMLElement>(
    `[data-record-id="${CSS.escape(recordId)}"]`,
  );
  if (!card) return false;
  card.focus();
  return true;
}

/**
 * Entering edit mode unmounts the Editar button that had focus, and Radix hands focus to the
 * dialog itself — which a reader then reads whole, every label glued to its value (OBT-621,
 * heard in Orca). The first field of the open tab is where the person was going anyway.
 */
const FIRST_FIELD = [
  "input:not([disabled]):not([type=hidden])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "button[role=combobox]:not([disabled])",
].join(", ");

export function focusFirstField(container: HTMLElement | null): boolean {
  const field = container?.querySelector<HTMLElement>(FIRST_FIELD);
  if (!field) return false;
  field.focus();
  return true;
}

export function scheduleFocusRescue(): void {
  if (typeof document === "undefined") return;
  if (typeof requestAnimationFrame !== "function") return;
  requestAnimationFrame(() => {
    rescueFocus(documentHost(document));
  });
}
