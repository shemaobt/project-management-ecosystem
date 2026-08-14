import { Trans, useTranslation } from "react-i18next";
import type { Project } from "../../../types/project";
import { IndicatorBand } from "./IndicatorBand";

export interface HeroProps {
  projects: readonly Project[] | null;
}

export function Hero({ projects }: HeroProps) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden border-b border-line bg-canvas px-5 py-5 sm:px-8 sm:pt-9 sm:pb-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-2.5 -right-5 [font-family:serif] text-[180px] leading-none font-light text-telha/[0.06] select-none"
      >
        שמע
      </div>
      <div className="relative mx-auto grid w-full max-w-[1500px] grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)] lg:gap-12">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold tracking-[0.18em] text-telha uppercase">
            {t("headline_eyebrow")}
          </p>
          <h1 className="font-serif text-[clamp(28px,3.4vw,44px)] leading-[1.05] font-normal text-fg italic [text-wrap:balance]">
            <Trans
              i18nKey="headline"
              components={{ em: <em className="text-telha not-italic" /> }}
            />
          </h1>
          <p className="mt-1 max-w-[50ch] text-[13px] text-fg-muted">
            {t("headline_sub")}
          </p>
        </div>
        <IndicatorBand projects={projects} />
      </div>
    </section>
  );
}
