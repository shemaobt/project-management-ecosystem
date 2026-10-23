export const transitionColors: string =
  "transition-colors duration-(--duration-fast) ease-out";

export const transitionAll: string =
  "transition-all duration-(--duration-fast) ease-out";

// `aria-disabled` looks the same but keeps the pointer: a control that stays in the tab order
// to say why it does not act yet (the ficha's Salvar, OBT-621) still answers the click.
export const disabledControl: string =
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50";
