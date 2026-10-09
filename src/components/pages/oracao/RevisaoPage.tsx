import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PRAYER_SOURCE_LABEL_KEYS } from "../../../constants/prayer";
import {
  failureMessage,
  prayerReviewAPI,
  toApiFailure,
  type PrayerReviewAPI,
} from "../../../services/api";
import type { PrayerReviewEntry } from "../../../types/prayer";
import type { ApiFailure } from "../../../types/session";
import { releasePayload } from "../../../utils/prayer";
import { getLanguageNameDisplay } from "../../../utils/region";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, Textarea, toast } from "../../ui";
import { SubNav } from "./SubNav";
import {
  PRAYER_EYEBROW,
  PRAYER_LEAD,
  PRAYER_PAGE,
  PRAYER_TITLE,
  REQUEST_CARD,
  REQUEST_CARD_HEAD,
  REQUEST_CARD_LANGUAGE,
  REQUEST_CARD_TAG,
  REQUEST_GRID,
} from "./surface";

/** The queue as it stands for this coordinator — one union, as the wall's `WallLoad`. */
export type QueueLoad =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly entries: readonly PrayerReviewEntry[] }
  | { readonly status: "failed"; readonly failure: ApiFailure };

interface ReviewCardProps {
  entry: PrayerReviewEntry;
  onRelease: (entry: PrayerReviewEntry, draft: string) => Promise<void>;
}

function ReviewCard({ entry, onRelease }: ReviewCardProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(entry.text);
  const [sending, setSending] = useState(false);
  const fieldId = `revisao-${entry.id}`;

  async function release() {
    setSending(true);
    try {
      await onRelease(entry, draft);
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={REQUEST_CARD}>
      <div className={REQUEST_CARD_HEAD}>
        <span className={REQUEST_CARD_LANGUAGE}>
          {getLanguageNameDisplay(
            { languageName: entry.language, languageNameWithheld: entry.languageNameWithheld },
            t,
          )}
        </span>
        <span className={REQUEST_CARD_TAG}>
          {t(PRAYER_SOURCE_LABEL_KEYS[entry.source])}
        </span>
      </div>
      <label htmlFor={fieldId} className="mb-1.5 text-small font-semibold text-fg">
        {t("oracao_revisao_text_label")}
      </label>
      <Textarea
        id={fieldId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="mb-3.5 font-serif"
      />
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          disabled={sending || releasePayload(entry, draft) === null}
          onClick={() => void release()}
        >
          {t("oracao_revisao_release")}
        </Button>
      </div>
    </article>
  );
}

export interface RevisaoViewProps {
  queue: QueueLoad;
  onRelease: (entry: PrayerReviewEntry, draft: string) => Promise<void>;
}

/**
 * The coordination's review of a sensitive project's prayer requests (OBT-575 — Karina, via
 * Daniel: *"a coordenação revisa o texto antes de ele ir ao mural e ao Pulso"*). Each card is
 * the team's text, editable; releasing sends it to the wall and the Pulse as it stands in the
 * field. Built from the wall's own card and controls — the prototype has no queue screen. A
 * refused release reads the queue again: a team that wrote a new text since is a 409, and the
 * card comes back with the new text to read, keyed by it so the field starts from it.
 */
export function RevisaoView({ queue, onRelease }: RevisaoViewProps) {
  const { t } = useTranslation();

  return (
    <section className={PRAYER_PAGE}>
      <header className="mb-5.5">
        <p className={PRAYER_EYEBROW}>{t("oracao_eyebrow")}</p>
        <h1 className={PRAYER_TITLE}>{t("oracao_revisao_title")}</h1>
        <p className={PRAYER_LEAD}>{t("oracao_revisao_lead")}</p>
      </header>

      <SubNav reviews />

      {queue.status === "loading" && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      )}
      {queue.status === "failed" && (
        <EmptyState message={failureMessage(queue.failure, t)} />
      )}
      {queue.status === "ready" &&
        (queue.entries.length === 0 ? (
          <EmptyState message={t("oracao_revisao_empty")} />
        ) : (
          <div className={REQUEST_GRID}>
            {queue.entries.map((entry) => (
              <ReviewCard
                key={`${entry.id}:${entry.text}`}
                entry={entry}
                onRelease={onRelease}
              />
            ))}
          </div>
        ))}
    </section>
  );
}

function LiveRevisaoPage({ api }: { api: PrayerReviewAPI }) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<QueueLoad>({ status: "loading" });
  const [reads, setReads] = useState(0);

  useEffect(() => {
    let current = true;
    api.list().then(
      (entries) => {
        if (current) setQueue({ status: "ready", entries });
      },
      (raw: unknown) => {
        if (current) setQueue({ status: "failed", failure: toApiFailure(raw) });
      },
    );
    return () => {
      current = false;
    };
  }, [api, reads]);

  async function release(entry: PrayerReviewEntry, draft: string) {
    const payload = releasePayload(entry, draft);
    if (payload === null) return;
    try {
      await api.release(entry.projectId, payload);
    } catch (raw: unknown) {
      toast.error(failureMessage(toApiFailure(raw), t));
      setReads((count) => count + 1);
      return;
    }
    setQueue((now) =>
      now.status === "ready"
        ? { status: "ready", entries: now.entries.filter((row) => row.id !== entry.id) }
        : now,
    );
    toast.success(t("oracao_revisao_released"));
  }

  return <RevisaoView queue={queue} onRelease={release} />;
}

/**
 * Against the server only, as the Pulse: with no server there is no queue to read, and a
 * sample that looked like a waiting request is what must never be mistaken for one.
 */
export function RevisaoPage() {
  const { t } = useTranslation();
  if (prayerReviewAPI === null) {
    return (
      <section className={PRAYER_PAGE}>
        <EmptyState message={t("oracao_revisao_needs_server")} />
      </section>
    );
  }
  return <LiveRevisaoPage api={prayerReviewAPI} />;
}
