import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["xs", "sm", "md", "lg", "xl", "pill"],
      text: [
        "display",
        "h1",
        "h2",
        "h3",
        "h4",
        "lead",
        "body",
        "small",
        "micro",
        "tag",
        "eyebrow",
      ],
      tracking: ["eyebrow", "button"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
