import { useEffect, useState, type RefObject } from "react";

export function useUnitScale(
  ref: RefObject<Element | null>,
  units: number,
): number {
  const [pxPerUnit, setPxPerUnit] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setPxPerUnit(width / units);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [ref, units]);
  return pxPerUnit;
}
