import { useTranslation } from "react-i18next";
import { Button } from "../../ui";

export interface NetworkNoticesProps {
  reviewDueCount: number;
  withheldCount: number;
  withheldReviewDueCount: number;
  /**
   * Opens the listing of somebody the count holds (OBT-681) — given only to whoever adds people
   * to the network, and offered only while the count has somebody in it to find.
   */
  onListWithheld?: () => void;
}

export function NetworkNotices({
  reviewDueCount,
  withheldCount,
  withheldReviewDueCount,
  onListWithheld,
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
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-line bg-muted px-4 py-3">
          <p className="min-w-0 flex-1 basis-60 text-small leading-normal text-fg-muted">
            {t("int_withheld_count", { count: withheldCount })}
            {withheldReviewDueCount > 0 ? (
              <>
                {" "}
                {t("int_withheld_review_due", { count: withheldReviewDueCount })}
              </>
            ) : null}
          </p>
          {onListWithheld ? (
            <Button variant="secondary" size="sm" onClick={onListWithheld}>
              {t("int_list_withheld")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
