import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, toast } from "../ui";

export interface OneTimeLinkProps {
  url: string;
  heading: string;
  note: string;
  footer?: ReactNode;
}

export function OneTimeLink({ url, heading, note, footer }: OneTimeLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("link_copy_failed"));
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-muted p-3.5">
      <p className="text-micro font-bold tracking-button uppercase text-fg-muted">
        {heading}
      </p>
      <p className="text-small leading-body text-fg">{note}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm bg-elevated px-2.5 py-1.5 text-tag text-fg-strong">
          {url}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={copyLink}>
          {copied ? (
            <Check size={14} strokeWidth={1.75} aria-hidden />
          ) : (
            <Copy size={14} strokeWidth={1.75} aria-hidden />
          )}
          {copied ? t("link_copied") : t("link_copy")}
        </Button>
      </div>
      {footer}
    </div>
  );
}
