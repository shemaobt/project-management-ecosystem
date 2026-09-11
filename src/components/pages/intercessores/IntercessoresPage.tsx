import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePrayerStore } from "../../../stores/prayerStore";
import type { IntercessorEntry } from "../../../types/prayer";
import {
  EMPTY_CREATE_DRAFT,
  groupByCountry,
  matchesQuery,
  missingCreateFields,
  missingEditFields,
  toEditDraft,
  type CreateField,
  type EditField,
  type IntercessorCreateDraft,
  type IntercessorEditDraft,
} from "../../../utils/intercessors";
import { countryName } from "../../../utils/countries";
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
  Input,
} from "../../ui";
import { CountryGroup } from "./CountryGroup";
import { EditIntercessorDialog } from "./EditIntercessorDialog";
import { IntercessorForm } from "./IntercessorForm";

export interface IntercessoresViewProps {
  people: readonly IntercessorEntry[] | null;
  withheldCount: number;
  onAdd: (draft: IntercessorCreateDraft) => Promise<boolean>;
  onUpdate: (id: string, draft: IntercessorEditDraft) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onRevealContact: (id: string) => Promise<string | null>;
}

export function IntercessoresView({
  people,
  withheldCount,
  onAdd,
  onUpdate,
  onRemove,
  onRevealContact,
}: IntercessoresViewProps) {
  const { t } = useTranslation();
  const [createDraft, setCreateDraft] =
    useState<IntercessorCreateDraft>(EMPTY_CREATE_DRAFT);
  const [createShowing, setCreateShowing] = useState<readonly CreateField[]>(
    [],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<IntercessorEditDraft | null>(
    null,
  );
  const [editShowing, setEditShowing] = useState<readonly EditField[]>([]);
  const [revealing, setRevealing] = useState(false);

  const [contactingId, setContactingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<IntercessorEntry | null>(null);
  const [query, setQuery] = useState("");

  const locale = t("locale");
  const visible = useMemo(() => {
    const source = people ?? [];
    if (!query.trim()) return source;
    return source.filter((person) =>
      matchesQuery(person, query, countryName(person.country, locale)),
    );
  }, [people, query, locale]);
  const groups = useMemo(
    () => groupByCountry(visible, locale),
    [visible, locale],
  );

  const submitCreate = async () => {
    const missing = missingCreateFields(createDraft);
    if (missing.length > 0) {
      setCreateShowing(missing);
      return;
    }
    const done = await onAdd(createDraft);
    if (done) {
      setCreateDraft(EMPTY_CREATE_DRAFT);
      setCreateShowing([]);
    }
  };

  const startEdit = async (person: IntercessorEntry) => {
    setEditingId(person.id);
    setEditShowing([]);
    setRevealing(true);
    const contact = await onRevealContact(person.id);
    setRevealing(false);
    setEditDraft({ ...toEditDraft(person), contact: contact ?? "" });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditShowing([]);
    setRevealing(false);
  };

  const submitEdit = async () => {
    if (!editDraft || !editingId) return;
    const missing = missingEditFields(editDraft);
    if (missing.length > 0) {
      setEditShowing(missing);
      return;
    }
    const done = await onUpdate(editingId, editDraft);
    if (done) closeEdit();
  };

  const handleContact = async (person: IntercessorEntry) => {
    setContactingId(person.id);
    const contact = await onRevealContact(person.id);
    setContactingId(null);
    if (!contact) return;
    window.location.href =
      person.contactChannel === "email" ? `mailto:${contact}` : `tel:${contact}`;
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
        draft={createDraft}
        onChange={setCreateDraft}
        onSubmit={submitCreate}
        showing={createShowing}
      />

      {people === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-small font-semibold text-fg-muted">
              {t("int_count", { count: total })}
            </p>
            <div className="relative">
              <Search
                size={14}
                strokeWidth={1.75}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search_placeholder")}
                className="w-56 rounded-pill py-2 pr-9 pl-9 text-[13px]"
              />
              {query !== "" ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("search_clear")}
                  className="absolute top-1/2 right-2 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-pill bg-muted text-fg-muted transition-colors duration-fast ease-out hover:bg-telha hover:text-on-brand"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              ) : null}
            </div>
          </div>

          {withheldCount > 0 ? (
            <p className="mb-4 rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
              {t("int_withheld_count", { count: withheldCount })}
            </p>
          ) : null}

          {groups.length === 0 ? (
            <EmptyState message={total === 0 ? t("int_empty") : t("int_search_empty")} />
          ) : (
            groups.map((group) => (
              <CountryGroup
                key={group.code}
                group={group}
                contactingId={contactingId}
                onEdit={startEdit}
                onRemove={setRemoving}
                onContact={handleContact}
              />
            ))
          )}
        </>
      )}

      <p className="mt-4.5 max-w-[80ch] text-micro leading-normal text-fg-subtle">
        {t("int_send_pending")} {t("int_footnote")}
      </p>

      <EditIntercessorDialog
        open={editingId !== null}
        draft={editDraft}
        revealing={revealing}
        showing={editShowing}
        onChange={setEditDraft}
        onSubmit={submitEdit}
        onClose={closeEdit}
      />

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
              onClick={async () => {
                if (removing) await onRemove(removing.id);
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
  const withheldCount = usePrayerStore((state) => state.withheldCount);
  const hydrated = usePrayerStore((state) => state.hydrated);
  const hydrate = usePrayerStore((state) => state.hydrate);
  const addIntercessor = usePrayerStore((state) => state.addIntercessor);
  const updateIntercessor = usePrayerStore((state) => state.updateIntercessor);
  const removeIntercessor = usePrayerStore((state) => state.removeIntercessor);
  const revealContact = usePrayerStore((state) => state.revealContact);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <IntercessoresView
      people={hydrated ? intercessors : null}
      withheldCount={withheldCount}
      onAdd={addIntercessor}
      onUpdate={updateIntercessor}
      onRemove={removeIntercessor}
      onRevealContact={revealContact}
    />
  );
}
