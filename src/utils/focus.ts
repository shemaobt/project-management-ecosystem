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

export function scheduleFocusRescue(): void {
  if (typeof document === "undefined") return;
  if (typeof requestAnimationFrame !== "function") return;
  requestAnimationFrame(() => {
    rescueFocus(documentHost(document));
  });
}
