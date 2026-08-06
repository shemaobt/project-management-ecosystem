import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={24}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-2 rounded-pill px-4.5 py-3 text-[13px] font-semibold tracking-[0.02em] text-on-dark shadow-lg",
          default: "bg-inverse",
          success: "bg-verde-claro",
          error: "bg-telha",
          warning: "bg-status-attention",
          info: "bg-azul",
          loading: "bg-inverse",
          description: "font-normal text-branco/80",
          actionButton:
            "rounded-pill bg-branco/15 px-2.5 py-1 text-micro font-bold uppercase",
        },
      }}
    />
  );
}
