/**
 * The prayer area's page and card, one owner for the wall and the review queue (OBT-575) —
 * `DS-PROJECT/app.css` `.or-card` (4008–4012) and `oracao.jsx` 143–149.
 */
export const PRAYER_PAGE =
  "mx-auto w-full max-w-(--container-mural) px-(--container-pad) pt-8 pb-20";

export const PRAYER_EYEBROW =
  "mb-2.5 text-[12px] leading-none font-bold tracking-[0.16em] text-telha uppercase";

export const PRAYER_TITLE =
  "mb-3 text-[34px] leading-[1.08] font-extrabold tracking-[-0.01em] text-fg-strong";

export const PRAYER_LEAD =
  "max-w-[70ch] font-serif text-[15px] leading-[1.6] text-fg-muted italic";

export const REQUEST_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3.5";

export const REQUEST_CARD =
  "flex flex-col rounded-[16px] border border-line bg-elevated px-5.5 py-5";

export const REQUEST_CARD_HEAD = "mb-2.5 flex items-baseline justify-between gap-2.5";

export const REQUEST_CARD_LANGUAGE =
  "text-[17px] leading-[1.2] font-extrabold text-fg-strong";

export const REQUEST_CARD_TAG =
  "shrink-0 text-[11px] leading-none font-semibold tracking-[0.04em] text-fg-subtle uppercase";
