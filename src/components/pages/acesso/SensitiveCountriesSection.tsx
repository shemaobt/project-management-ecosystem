import { Plus, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  failureMessage,
  toApiFailure,
  type AccessAPI,
} from "../../../services/api";
import type { SensitiveCountry } from "../../../types/access";
import type { ApiFailure } from "../../../types/session";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, Input, Label } from "../../ui";
import { Panel } from "./Panel";
import { RefusalNote } from "./RefusalNote";
import { listOfRows, rowsOf, sameList, type SensitiveRow } from "./sensitiveList";

export interface SensitiveCountriesEditorProps {
  saved: readonly SensitiveCountry[];
  working: boolean;
  refusal: ApiFailure | null;
  done: boolean;
  onSave: (countries: SensitiveCountry[]) => void;
}

export function SensitiveCountriesEditor({
  saved,
  working,
  refusal,
  done,
  onSave,
}: SensitiveCountriesEditorProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [rows, setRows] = useState<SensitiveRow[]>(() => rowsOf(saved));
  const [added, setAdded] = useState(0);
  const unchanged = sameList(rows, saved);

  const edit = (key: string, field: "name" | "spellings", value: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (working || unchanged) return;
    onSave(listOfRows(rows));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-small text-fg-muted">{t("acesso_sensitive_empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.key}
              className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${fieldId}-${row.key}-name`}>
                  {t("acesso_sensitive_name")}
                </Label>
                <Input
                  id={`${fieldId}-${row.key}-name`}
                  value={row.name}
                  onChange={(event) => edit(row.key, "name", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`${fieldId}-${row.key}-spellings`}>
                  {t("acesso_sensitive_spellings")}
                </Label>
                <Input
                  id={`${fieldId}-${row.key}-spellings`}
                  value={row.spellings}
                  onChange={(event) => edit(row.key, "spellings", event.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={t("acesso_sensitive_remove", {
                  name: row.name || t("acesso_sensitive_unnamed"),
                })}
                onClick={() =>
                  setRows((current) => current.filter((entry) => entry.key !== row.key))
                }
              >
                <X size={14} strokeWidth={1.75} aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-micro leading-[1.45] text-fg-muted">
        {t("acesso_sensitive_spellings_hint")}
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setRows((current) => [
              ...current,
              { key: `added-${added}`, name: "", spellings: "" },
            ]);
            setAdded((current) => current + 1);
          }}
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden />
          {t("acesso_sensitive_add")}
        </Button>
      </div>

      {refusal ? <RefusalNote failure={refusal} /> : null}
      {done && unchanged ? (
        <p role="status" className="text-micro font-semibold text-fg">
          {t("acesso_sensitive_saved")}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={working || unchanged}>
          {working ? t("acesso_sensitive_saving") : t("acesso_sensitive_save")}
        </Button>
      </div>
    </form>
  );
}

interface ListReaderProps {
  api: AccessAPI;
  onRetry: () => void;
}

function ListReader({ api, onRetry }: ListReaderProps) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<readonly SensitiveCountry[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [working, setWorking] = useState(false);
  const [refusal, setRefusal] = useState<ApiFailure | null>(null);
  const [done, setDone] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .sensitiveCountries()
      .then((result) => {
        if (!cancelled) setSaved(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const save = (countries: SensitiveCountry[]) => {
    setWorking(true);
    setRefusal(null);
    setDone(false);
    api
      .saveSensitiveCountries(countries)
      .then((result) => {
        setSaved(result);
        setVersion((current) => current + 1);
        setDone(true);
      })
      .catch((raw: unknown) => setRefusal(toApiFailure(raw)))
      .finally(() => setWorking(false));
  };

  if (failure) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-small text-fg-muted">{failureMessage(failure, t)}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      </div>
    );
  }
  if (saved === null) return <LoadingSpinner size="sm" label={t("loading")} />;
  return (
    <SensitiveCountriesEditor
      key={version}
      saved={saved}
      working={working}
      refusal={refusal}
      done={done}
      onSave={save}
    />
  );
}

export interface SensitiveCountriesSectionProps {
  api: AccessAPI;
}

export function SensitiveCountriesSection({ api }: SensitiveCountriesSectionProps) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);

  return (
    <Panel
      id="paises-sensiveis"
      title={t("acesso_sensitive_title")}
      lead={t("acesso_sensitive_lead")}
    >
      <ListReader
        key={attempt}
        api={api}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </Panel>
  );
}
