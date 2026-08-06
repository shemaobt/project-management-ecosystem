import type { ReactNode } from "react";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-eyebrow uppercase text-fg-muted">{title}</p>
      {children}
    </section>
  );
}
