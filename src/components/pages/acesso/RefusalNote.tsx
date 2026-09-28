import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApiFailure } from "../../../types/session";
import { cn } from "../../../utils/cn";
import { readRefusal } from "./refusal";

export interface RefusalNoteProps {
  failure: ApiFailure;
  className?: string;
}

export function RefusalNote({ failure, className }: RefusalNoteProps) {
  const { t } = useTranslation();
  const refusal = readRefusal(failure, t);

  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-1.5 text-micro leading-[1.45] font-semibold text-accent-press",
        className,
      )}
    >
      <AlertTriangle
        size={14}
        strokeWidth={1.75}
        aria-hidden
        className="mt-px shrink-0"
      />
      {refusal.from === "server" ? (
        <span>
          {t("acesso_server_refused")}{" "}
          <span lang="en">{refusal.sentence}</span>
        </span>
      ) : (
        <span>{refusal.sentence}</span>
      )}
    </p>
  );
}
