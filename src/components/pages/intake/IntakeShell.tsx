import type { ReactNode } from "react";
import { BrandMark } from "../../common/BrandMark";

export interface IntakeShellProps {
  children: ReactNode;
}

/**
 * No AppShell, no nav, no session — the leader link's whole page. Mirrors the sign-in
 * screen's layout (EntrarView) because both are the same kind of surface: someone
 * arriving with no account, on a phone.
 */
export function IntakeShell({ children }: IntakeShellProps) {
  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-canvas px-4 py-8 sm:items-center sm:px-5 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 [font-family:serif] text-[160px] leading-none font-light text-telha/[0.06] select-none sm:text-[220px]"
      >
        שמע
      </div>

      <section className="relative w-full max-w-modal-narrow rounded-lg bg-elevated p-6 shadow-card sm:p-8">
        <BrandMark className="mb-5 text-verde-claro" />
        {children}
      </section>
    </main>
  );
}
