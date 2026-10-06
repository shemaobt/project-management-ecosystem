import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../../ui";

export interface SenhaNoticeProps {
  titleKey: string;
  bodyKey: string;
  to: string;
  linkKey: string;
}

/** A notice that replaces the form: title, one sentence, one way out. */
export function SenhaNotice({ titleKey, bodyKey, to, linkKey }: SenhaNoticeProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t(titleKey)}
      </h1>
      <p className="max-w-[46ch] text-small leading-normal text-fg-muted">{t(bodyKey)}</p>
      <div>
        <Button asChild size="sm" variant="secondary">
          <Link to={to}>{t(linkKey)}</Link>
        </Button>
      </div>
    </div>
  );
}
