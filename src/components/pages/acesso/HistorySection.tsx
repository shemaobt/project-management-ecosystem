import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  toApiFailure,
  type AccessAPI,
} from "../../../services/api";
import type { GrantChange } from "../../../types/access";
import type { ApiFailure } from "../../../types/session";
import { formatDate, utcDay } from "../../../utils/format";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { LoadMore } from "../projetos/LoadMore";
import { changeSentence } from "./labels";
import { Panel } from "./Panel";

export const HISTORY_STEP = 30;

export interface HistoryListProps {
  changes: readonly GrantChange[] | null;
  error: string | null;
  shown: number;
  onMore: () => void;
  onRetry: () => void;
}

export function HistoryList({ changes, error, shown, onMore, onRetry }: HistoryListProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-small text-fg-muted">{error}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      </div>
    );
  }
  if (changes === null) return <LoadingSpinner size="sm" label={t("loading")} />;
  if (changes.length === 0) {
    return <p className="text-small text-fg-muted">{t("acesso_history_empty")}</p>;
  }

  return (
    <>
      <ol className="divide-y divide-line">
        {changes.slice(0, shown).map((change, index) => (
          <li
            key={`${change.at}:${change.userId}:${change.roleKey ?? change.regionKey}:${index}`}
            className="flex items-start gap-3 py-3"
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill bg-muted text-fg-muted"
            >
              {change.action === "granted" ? (
                <Plus size={13} strokeWidth={2} />
              ) : (
                <Minus size={13} strokeWidth={2} />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small leading-normal wrap-anywhere text-fg">
                {changeSentence(change, t)}
              </span>
              <span className="text-micro text-fg-subtle">
                {formatDate(utcDay(change.at), locale)}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {shown < changes.length ? (
        <LoadMore
          shown={shown}
          total={changes.length}
          step={HISTORY_STEP}
          onMore={onMore}
        />
      ) : null}
    </>
  );
}

interface ChangesReaderProps {
  api: AccessAPI;
  onRetry: () => void;
}

function ChangesReader({ api, onRetry }: ChangesReaderProps) {
  const { t } = useTranslation();
  const [changes, setChanges] = useState<readonly GrantChange[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [shown, setShown] = useState(HISTORY_STEP);

  useEffect(() => {
    let cancelled = false;
    api
      .changes()
      .then((result) => {
        if (!cancelled) setChanges(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <HistoryList
      changes={changes}
      error={failure ? failureMessage(failure, t) : null}
      shown={shown}
      onMore={() => setShown((current) => current + HISTORY_STEP)}
      onRetry={onRetry}
    />
  );
}

export interface HistorySectionProps {
  api: AccessAPI;
  revision: number;
}

export function HistorySection({ api, revision }: HistorySectionProps) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);

  return (
    <Panel title={t("acesso_history_title")} lead={t("acesso_history_note")}>
      <ChangesReader
        key={`${revision}:${attempt}`}
        api={api}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </Panel>
  );
}
