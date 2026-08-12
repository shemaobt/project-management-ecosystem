import { useState, type ChangeEvent, type DragEvent } from "react";
import { X } from "lucide-react";
import {
  IMAGE_FILE_ACCEPT,
  isAcceptedImageFile,
  storeImageFile,
} from "../../services/mediaStorage";
import { circleControl, photoSlotSurface, transitionColors } from "../../styles";
import type { StoredImage } from "../../types/project";
import { cn } from "../../utils/cn";

export interface ImageUploadProps {
  id: string;
  value: StoredImage | null;
  onChange: (next: StoredImage | null) => void;
  onRejected: () => void;
  placeholder: string;
  removeLabel: string;
}

export function ImageUpload({
  id,
  value,
  onChange,
  onRejected,
  placeholder,
  removeLabel,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const receive = async (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImageFile(file)) {
      onRejected();
      return;
    }
    onChange(await storeImageFile(file));
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void receive(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void receive(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-[8px]",
        dragOver && "outline-2 outline-offset-2 outline-accent",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <label
        htmlFor={id}
        className={cn(
          "flex h-full w-full cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
          !value && photoSlotSurface,
        )}
      >
        {value ? (
          <img
            src={value.src}
            alt={value.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="m-auto px-2 text-center font-serif text-[11px] italic text-on-dark [text-shadow:0_1px_2px_color-mix(in_srgb,var(--color-preto)_20%,transparent)]">
            {placeholder}
          </span>
        )}
        <input
          id={id}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="sr-only"
          onChange={onInputChange}
        />
      </label>
      {value && (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          className={cn(
            circleControl,
            transitionColors,
            "absolute top-1.5 right-1.5 size-6.5 bg-elevated/85 text-fg hover:bg-accent-soft hover:text-telha",
          )}
          onClick={() => onChange(null)}
        >
          <X size={14} strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}
