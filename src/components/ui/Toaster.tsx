import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };

export const TOAST_CLASSNAMES = {
  toast: "flex w-full items-center gap-2 rounded-pill px-4.5 py-3 text-[13px] font-semibold tracking-[0.02em] bg-inverse text-on-dark shadow-lg",
  success: "data-[type=success]:bg-verde-claro-ink data-[type=success]:text-on-brand",
  error: "data-[type=error]:bg-telha data-[type=error]:text-on-brand",
  warning: "data-[type=warning]:bg-status-attention-fg",
  info: "data-[type=info]:bg-azul-ink",
  description: "font-normal text-current/80",
  actionButton:
    "rounded-pill bg-branco/15 px-2.5 py-1 text-micro font-bold uppercase",
};

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={24}
      toastOptions={{ unstyled: true, classNames: TOAST_CLASSNAMES }}
    />
  );
}
