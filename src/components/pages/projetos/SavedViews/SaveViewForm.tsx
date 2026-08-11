import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_VIEW_NAME } from "../../../../stores/savedViewsStore";
import { Button, Input } from "../../../ui";

export interface SaveViewFormProps {
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function SaveViewForm({ onSave, onCancel }: SaveViewFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  return (
    <form
      className="mb-2 flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSave(name);
      }}
    >
      <Input
        autoFocus
        value={name}
        maxLength={MAX_VIEW_NAME}
        placeholder={t("sb_save_view_name")}
        aria-label={t("sb_save_view_prompt")}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        className="py-1.5 text-micro"
      />
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {t("sb_save_view_confirm")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t("sb_save_view_cancel")}
        </Button>
      </div>
    </form>
  );
}
