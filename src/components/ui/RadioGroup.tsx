import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { useRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";
import { transitionColors } from "../../styles";
import { optionLabel } from "./option";

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function radioIn(group: Element, target: EventTarget): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target.getAttribute("role") !== "radio") return null;
  return target.closest('[role="radiogroup"]') === group ? target : null;
}

/**
 * Radix moves focus on an arrow in a timer and checks the item only if an arrow is still
 * down when focus lands, so a tap released first — a test driver, a switch, a phone too busy
 * to run the timer in time — moved focus and left the choice behind (OBT-629, the first
 * arrow after a click on the prayer wall's chips). The group finishes the move Radix started,
 * once: a click Radix makes itself closes it before the focus bubbles here, and the timer
 * below runs after Radix's, so a move that took focus nowhere does not outlive its key.
 */
export function RadioGroup({
  className,
  onKeyDown,
  onClickCapture,
  onFocus,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  const arrowMove = useRef(false);

  return (
    <RadioGroupPrimitive.Root
      className={cn("flex flex-wrap", className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented || !ARROW_KEYS.has(event.key)) return;
        if (!radioIn(event.currentTarget, event.target)) return;
        arrowMove.current = true;
        setTimeout(() => {
          arrowMove.current = false;
        });
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        arrowMove.current = false;
      }}
      onFocus={(event) => {
        onFocus?.(event);
        const radio = radioIn(event.currentTarget, event.target);
        if (!arrowMove.current || !radio) return;
        arrowMove.current = false;
        radio.click();
      }}
      {...props}
    />
  );
}

export interface RadioProps extends Omit<
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
  "aria-label"
> {
  label: string;
}

export function Radio({ label, className, ...props }: RadioProps) {
  return (
    <RadioGroupPrimitive.Item
      aria-label={label}
      className={cn(
        `flex size-4 shrink-0 items-center justify-center rounded-pill border border-line-strong bg-elevated ${transitionColors} data-[state=checked]:border-telha disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-pill bg-brand" />
    </RadioGroupPrimitive.Item>
  );
}

export function RadioButton({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        `cursor-pointer ${transitionColors} disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    />
  );
}

export type RadioFieldProps = RadioProps;

export function RadioField({
  label,
  id,
  className,
  ...props
}: RadioFieldProps) {
  return (
    <label className={cn(optionLabel, className)} htmlFor={id}>
      <Radio id={id} label={label} {...props} />
      <span>{label}</span>
    </label>
  );
}
