import { useTranslation } from "react-i18next";

export interface NetworkNoticesProps {
  reviewDueCount: number;
  withheldCount: number;
  withheldReviewDueCount: number;
}

export function NetworkNotices({
  reviewDueCount,
  withheldCount,
  withheldReviewDueCount,
}: NetworkNoticesProps) {
  const { t } = useTranslation();

  return (
    <>
      {reviewDueCount > 0 ? (
        <p className="mb-4 rounded-md border border-line-strong bg-elevated px-4 py-3 text-small leading-normal text-fg">
          {t("int_review_due_count", { count: reviewDueCount })}
        </p>
      ) : null}

      {withheldCount > 0 ? (
        <p className="mb-4 rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
          {t("int_withheld_count", { count: withheldCount })}
          {withheldReviewDueCount > 0 ? (
            <>
              {" "}
              {t("int_withheld_review_due", { count: withheldReviewDueCount })}
            </>
          ) : null}
        </p>
      ) : null}
    </>
  );
}
