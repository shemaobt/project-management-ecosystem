import { Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  addPerson,
  removePerson,
  splitPeople,
} from "../../../../../utils/people";
import { Button, Input } from "../../../../ui";
import type { FieldControlProps } from "../../fields";

export interface PeopleFieldProps {
  control: FieldControlProps;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}

export function PeopleField({
  control,
  value,
  placeholder,
  onChange,
}: PeopleFieldProps) {
  const { t } = useTranslation();
  const [entry, setEntry] = useState("");
  const people = splitPeople(value);

  const commit = () => {
    const next = addPerson(value, entry);
    setEntry("");
    if (next !== value) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          {...control}
          value={entry}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={entry.trim().length === 0}
          onClick={commit}
        >
          <Plus size={14} strokeWidth={2.25} />
          {t("f_people_add")}
        </Button>
      </div>

      {people.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {people.map((person, index) => (
            <li
              key={`${person}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-elevated py-1 pr-1 pl-3 text-[13px] font-medium text-fg"
            >
              {person}
              <button
                type="button"
                aria-label={t("f_people_remove", { name: person })}
                onClick={() => onChange(removePerson(value, index))}
                className="inline-flex size-5 cursor-pointer items-center justify-center rounded-pill text-fg-muted transition-colors duration-fast ease-out hover:bg-accent-soft hover:text-telha"
              >
                <X size={13} strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
