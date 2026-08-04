import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva("fixed z-50 flex flex-col bg-elevated shadow-lg", {
  variants: {
    side: {
      right:
        "inset-y-0 right-0 h-full w-full max-w-md animate-slide-in-right rounded-l-lg",
      left: "inset-y-0 left-0 h-full w-full max-w-md animate-slide-in-left rounded-r-lg",
      bottom: "inset-x-0 bottom-0 max-h-[85vh] animate-slide-up rounded-t-lg",
    },
  },
  defaultVariants: {
    side: "right",
  },
});

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  closeLabel: string;
}

export function SheetContent({
  className,
  children,
  side,
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-preto/55 backdrop-blur-[6px]" />
      <DialogPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-pill text-fg-muted transition-colors duration-[140ms] ease-out hover:bg-muted hover:text-telha"
        >
          <X size={16} strokeWidth={1.75} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-line px-6 py-5",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-h4 font-semibold text-fg-strong", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("font-serif text-small italic text-fg-muted", className)}
      {...props}
    />
  );
}

export function SheetBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)} {...props} />
  );
}

export function SheetFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 border-t border-line bg-muted px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
