import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePrayerStore } from "../../../stores/prayerStore";
import type { Intercessor } from "../../../types/prayer";
import {
  groupByCountry,
  missingFields,
  toDraft,
  type IntercessorDraft,
  type IntercessorField,
} from "../../../utils/intercessors";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { SubNav } from "../oracao/SubNav";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import { CountryGroup } from "./CountryGroup";
import { IntercessorForm } from "./IntercessorForm";

const EMPTY_DRAFT: IntercessorDraft = { name: "", country: "", contact: "" };

export interface IntercessoresViewProps {
  people: readonly Intercessor[] | null;
  onAdd: (draft: IntercessorDraft) => boolean;
  onUpdate: (id: string, draft: IntercessorDraft) => boolean;
  onRemove: (id: string) => void;
}

export function IntercessoresView({
  people,
  onAdd,
  onUpdate,
  onRemove,
}: IntercessoresViewProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<IntercessorDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showing, setShowing] = useState<readonly IntercessorField[]>([]);
  const [removing, setRemoving] = useState<Intercessor | null>(null);

  const locale = t("locale");
  const groups = useMemo(
    () => groupByCountry(people ?? [], locale),
    [people, locale],
  );

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setShowing([]);
  };

  const submit = () => {
    const missing = missingFields(draft);
    if (missing.length > 0) {
      setShowing(missing);
      return;
    }
    const done = editingId ? onUpdate(editingId, draft) : onAdd(draft);
    if (done) reset();
  };

  const startEdit = (person: Intercessor) => {
    setDraft(toDraft(person));
    setEditingId(person.id);
    setShowing([]);
  };

  const total = people?.length ?? 0;

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6">
        <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
          {t("int_eyebrow")}
        </p>
        <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
          {t("int_title")}
        </h1>
        <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
          {t("int_lead")}
        </p>
      </header>

      <SubNav />

      <IntercessorForm
        draft={draft}
        onChange={setDraft}
        onSubmit={submit}
        onCancel={editingId ? reset : undefined}
        showing={showing}
        editing={editingId !== null}
      />

      {people === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <>
          <p className="mb-4 text-small font-semibold text-fg-muted">
            {t("int_count", { count: total })}
          </p>

          {groups.length === 0 ? (
            <EmptyState message={t("int_empty")} />
          ) : (
            groups.map((group) => (
              <CountryGroup
                key={group.code}
                group={group}
                onEdit={startEdit}
                onRemove={setRemoving}
              />
            ))
          )}
        </>
      )}

      <p className="mt-4.5 max-w-[80ch] text-micro leading-normal text-fg-subtle">
        {t("int_send_pending")} {t("int_footnote")}
      </p>

      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent size="narrow" closeLabel={t("btn_close")}>
          <DialogHeader>
            <DialogTitle>{t("int_remove")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-small leading-normal text-fg">
              {t("int_remove_confirm", { name: removing?.name ?? "" })}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t("btn_cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removing) onRemove(removing.id);
                setRemoving(null);
              }}
            >
              {t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function IntercessoresPage() {
  const intercessors = usePrayerStore((state) => state.intercessors);
  const hydrated = usePrayerStore((state) => state.hydrated);
  const hydrate = usePrayerStore((state) => state.hydrate);
  const addIntercessor = usePrayerStore((state) => state.addIntercessor);
  const updateIntercessor = usePrayerStore((state) => state.updateIntercessor);
  const removeIntercessor = usePrayerStore((state) => state.removeIntercessor);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <IntercessoresView
      people={hydrated ? intercessors : null}
      onAdd={(draft) => addIntercessor(draft, crypto.randomUUID())}
      onUpdate={updateIntercessor}
      onRemove={removeIntercessor}
    />
  );
}
