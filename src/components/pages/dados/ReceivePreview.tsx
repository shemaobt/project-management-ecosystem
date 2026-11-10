import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PulseFile } from "../../../services/pulseFile";
import type { Project } from "../../../types/project";
import { formatMonthName } from "../../../utils/format";
import { answersReachPrayerWall } from "../../../utils/prayer";
import { getLanguageNameDisplay } from "../../../utils/region";

export interface ReceivePreviewProps {
  file: PulseFile;
  project: Project;
}

const PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/u;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * What the returned file says, before anything is sent (D11): the same call files and applies, so
 * this is where the coordination reads the answers. The project is named from the record, as this
 * reader is allowed to read it, never from the file. A request for the network says, as the
 * leader's own form does, that once sent it cannot be recalled (`data-contracts.md` §11.3, rule 4) —
 * applying is what sends it. Every answer is drawn as text; the photo is
 * the file's own bytes, already checked against its hash and its type by the reader, drawn from
 * the file's own base64.
 */
export function ReceivePreview({ file, project }: ReceivePreviewProps) {
  const { t } = useTranslation();
  const { answers } = file;
  const period = typeof answers.period === "string" ? PERIOD.exec(answers.period) : null;
  const rows = Array.isArray(answers.bookProgress) ? answers.bookProgress.length : 0;
  const prayer = text(answers.prayerRequest);

  const lines: [string, ReactNode][] = [
    ["receive_preview_project", getLanguageNameDisplay(project, t)],
    [
      "receive_preview_period",
      period ? `${formatMonthName(Number(period[1]), Number(period[2]))} ${period[1]}` : null,
    ],
    ["receive_preview_by", text(answers.submittedBy)],
    ["receive_preview_voice", text(answers.voice)],
    ["receive_preview_progress", rows > 0 ? t("forms_submission_rows", { count: rows }) : null],
    ["receive_preview_blockers", text(answers.blockers)],
    ["receive_preview_prayer", prayer],
  ];
  if (prayer) {
    lines.push([
      "prayer_vis_label",
      answersReachPrayerWall(answers) ? (
        <>
          {t("prayer_vis_network")}
          <span className="mt-1 block text-fg-muted">{t("prayer_vis_network_no_recall")}</span>
        </>
      ) : (
        t("prayer_vis_coordination")
      ),
    ]);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <dl className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-[max-content_1fr]">
        {lines.map(([labelKey, value]) => (
          <div key={labelKey} className="contents">
            <dt className="text-tag font-bold tracking-button uppercase text-fg-muted">
              {t(labelKey)}
            </dt>
            <dd className="text-small whitespace-pre-wrap break-words text-fg">
              {value ?? t("forms_answer_empty")}
            </dd>
          </div>
        ))}
      </dl>
      <PreviewPhoto file={file} />
    </div>
  );
}

function PreviewPhoto({ file }: { file: PulseFile }) {
  const { t } = useTranslation();
  const { image } = file;
  if (!image) {
    return <p className="text-small text-fg-muted">{t("forms_submission_image_none")}</p>;
  }
  const description = text(file.answers.imageDescription);
  return (
    <figure className="flex max-w-sm flex-col gap-2">
      <img
        src={`data:${image.blob.type};base64,${image.base64}`}
        alt={t("forms_submission_image_alt")}
        className="w-full rounded-[8px]"
      />
      <figcaption className="flex flex-col gap-1 text-small text-fg">
        {description && <span className="whitespace-pre-wrap break-words">{description}</span>}
        <span className="text-fg-muted">
          {file.answers.imageAuthorized === true
            ? t("receive_preview_image_authorized")
            : t("receive_preview_image_not_authorized")}
        </span>
      </figcaption>
    </figure>
  );
}
