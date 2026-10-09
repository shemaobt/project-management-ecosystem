import { useId, useState, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTAKE_IMAGE_ACCEPT } from "../../../services/mediaStorage";
import type { IntakeImageUpload } from "../../../utils/intake";
import { cn } from "../../../utils/cn";
import { Button } from "../../ui";

export interface IntakeImageFieldProps {
  id: string;
  /** The id the server handed back, or nothing — what the `image` answer carries. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  upload: IntakeImageUpload;
  invalid: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "sending"; fileName: string }
  | { kind: "refused"; message: string };

interface Preview {
  id: string;
  src: string;
  fileName: string;
}

/**
 * The Pulse's image (OBT-578 / OBT-580): the bytes go up through the link as soon as the
 * leader picks the file, and the answer keeps only the id the server handed back — so a draft
 * restored after a reload still names the image it sent, with no bytes to show for it; the
 * preview lives in this component and nowhere else.
 */
export function IntakeImageField({ id, value, onChange, upload, invalid }: IntakeImageFieldProps) {
  const { t } = useTranslation();
  const statusId = useId();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [preview, setPreview] = useState<Preview | null>(null);

  const shown = value !== undefined && preview?.id === value ? preview : null;

  const receive = async (file: File | undefined) => {
    if (!file) return;
    setPhase({ kind: "sending", fileName: file.name });
    const outcome = await upload(file);
    if (!outcome.ok) {
      setPhase({ kind: "refused", message: outcome.message });
      return;
    }
    setPreview({ id: outcome.image.id, src: outcome.previewSrc, fileName: file.name });
    setPhase({ kind: "idle" });
    onChange(outcome.image.id);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void receive(event.target.files?.[0]);
    event.target.value = "";
  };

  const remove = () => {
    setPreview(null);
    setPhase({ kind: "idle" });
    onChange(undefined);
  };

  return (
    <div className="flex flex-col gap-2" aria-describedby={statusId}>
      {shown ? (
        <img
          src={shown.src}
          alt={shown.fileName}
          className="aspect-[4/3] w-full max-w-sm rounded-[8px] object-cover"
        />
      ) : null}

      <p id={statusId} className="text-tag text-fg-subtle">
        {phase.kind === "sending"
          ? t("intake_image_sending", { name: phase.fileName })
          : value !== undefined
            ? t("intake_image_sent", { name: shown?.fileName ?? "" }).trim()
            : t("intake_image_hint")}
      </p>

      {phase.kind === "refused" || invalid ? (
        <p role="alert" className="text-tag font-semibold text-telha">
          {phase.kind === "refused" ? phase.message : t("intake_err_image")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-line-strong bg-elevated px-3 py-1.5 text-micro font-semibold text-fg hover:border-fg-muted",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
            phase.kind === "sending" && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus size={14} strokeWidth={1.75} aria-hidden />
          {t(value !== undefined ? "intake_image_replace" : "intake_image_choose")}
          <input
            id={id}
            type="file"
            accept={INTAKE_IMAGE_ACCEPT}
            className="sr-only"
            disabled={phase.kind === "sending"}
            onChange={onInputChange}
          />
        </label>
        {value !== undefined ? (
          <Button type="button" size="sm" variant="ghost" onClick={remove}>
            <X size={14} strokeWidth={1.75} aria-hidden />
            {t("intake_image_remove")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
