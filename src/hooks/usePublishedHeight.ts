import { useLayoutEffect, type RefObject } from "react";

export const HEADER_HEIGHT_VAR = "--header-height";

export function usePublishedHeight(ref: RefObject<HTMLElement | null>, variable: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(variable, `${element.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(variable);
    };
  }, [ref, variable]);
}
