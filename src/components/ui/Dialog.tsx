import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 flex animate-fade-in justify-center overflow-y-auto bg-preto/55 px-4 py-8 backdrop-blur-[6px]",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  closeLabel: string;
}

export function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay>
        <DialogPrimitive.Content
          className={cn(
            "relative z-50 my-auto w-full max-w-modal animate-slide-up overflow-hidden rounded-lg bg-elevated shadow-lg",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-5 right-5 inline-flex size-9.5 items-center justify-center rounded-pill bg-branco/10 text-branco transition-colors duration-[140ms] ease-out hover:bg-branco/20"
          >
            <X size={18} strokeWidth={1.75} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex items-start justify-between gap-4 overflow-hidden bg-inverse px-8 pt-7 pb-6 text-on-dark",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-h3 font-semibold text-on-dark", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("font-serif text-small italic text-areia", className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "max-h-[calc(100vh-220px)] overflow-y-auto px-8 pt-7 pb-6",
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 border-t border-line bg-muted px-8 py-4.5",
        className,
      )}
      {...props}
    />
  );
}
