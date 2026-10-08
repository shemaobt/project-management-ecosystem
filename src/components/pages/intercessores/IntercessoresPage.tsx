import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
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
import { canWriteNetwork } from "../../../utils/access";
import { countryName } from "../../../utils/countries";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { SubNav } from "../oracao/SubNav";
import { Input } from "../../ui";
import { CountryGroup } from "./CountryGroup";
import { EditIntercessorDialog } from "./EditIntercessorDialog";
import { IntercessorForm } from "./IntercessorForm";
import { NetworkNotices } from "./NetworkNotices";
import { RemoveIntercessorDialog } from "./RemoveIntercessorDialog";

export interface IntercessoresViewProps {
  people: readonly IntercessorEntry[] | null;
  withheldCount: number;
  /** Of the withheld, how many are past their year — a number the server counted. */
  withheldReviewDueCount: number;
  /**
   * Whether this reader writes the network — coordination and the Admin (OBT-574). The
   * Resource Circle reads it and reveals a contact; it gets no form, no edit, no removal and
   * no review, which the server would refuse.
   */
  canWrite: boolean;
  onAdd: (draft: IntercessorCreateDraft) => Promise<boolean>;
  onUpdate: (id: string, draft: IntercessorEditDraft) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onRevealContact: (id: string) => Promise<string | null>;
  onReview: (id: string) => Promise<boolean>;
}

export function IntercessoresView({
  people,
  withheldCount,
  withheldReviewDueCount,
  canWrite,
  onAdd,
  onUpdate,
  onRemove,
  onRevealContact,
  onReview,
}: IntercessoresViewProps) {
  const { t } = useTranslation();
  const [createDraft, setCreateDraft] =
    useState<IntercessorCreateDraft>(EMPTY_CREATE_DRAFT);
  const [createShowing, setCreateShowing] = useState<readonly CreateField[]>(
    [],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<IntercessorEditDraft | null>(null);
  const [editShowing, setEditShowing] = useState<readonly EditField[]>([]);
  const [revealing, setRevealing] = useState(false);

  const [contactingId, setContactingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
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
      person.contactChannel === "email"
        ? `mailto:${contact}`
        : `tel:${contact}`;
  };

  const handleReview = async (person: IntercessorEntry) => {
    setReviewingId(person.id);
    await onReview(person.id);
    setReviewingId(null);
  };

  const total = people?.length ?? 0;
  // Over the whole network rather than the search: a filter must not hide that a review is owed.
  const reviewDueCount = (people ?? []).filter(
    (person) => person.reviewDue,
  ).length;

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

      {canWrite ? (
        <IntercessorForm
          draft={createDraft}
          onChange={setCreateDraft}
          onSubmit={submitCreate}
          showing={createShowing}
        />
      ) : null}

      {people === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-small font-semibold text-fg-muted">
              {t("int_count", { count: visible.length })}
              {visible.length !== total ? (
                <>
                  {" "}
                  {t("results_of")} {total}
                </>
              ) : null}
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

          <NetworkNotices
            reviewDueCount={reviewDueCount}
            withheldCount={withheldCount}
            withheldReviewDueCount={withheldReviewDueCount}
          />

          {groups.length === 0 ? (
            <EmptyState
              message={total === 0 ? t("int_empty") : t("int_search_empty")}
            />
          ) : (
            groups.map((group) => (
              <CountryGroup
                key={group.code}
                group={group}
                contactingId={contactingId}
                reviewingId={reviewingId}
                canWrite={canWrite}
                onEdit={startEdit}
                onRemove={setRemoving}
                onContact={handleContact}
                onReview={handleReview}
              />
            ))
          )}
        </>
      )}

      <p className="mt-4.5 max-w-[80ch] text-micro leading-normal text-fg-subtle">
        {t("int_send_pending")} {t("int_footnote")}
      </p>

      {canWrite ? (
        <>
          <EditIntercessorDialog
            open={editingId !== null}
            draft={editDraft}
            revealing={revealing}
            showing={editShowing}
            onChange={setEditDraft}
            onSubmit={submitEdit}
            onClose={closeEdit}
          />

          <RemoveIntercessorDialog
            removing={removing}
            onClose={() => setRemoving(null)}
            onConfirm={onRemove}
          />
        </>
      ) : null}
    </section>
  );
}

export function IntercessoresPage() {
  const { user } = useAuth();
  const intercessors = usePrayerStore((state) => state.intercessors);
  const withheldCount = usePrayerStore((state) => state.withheldCount);
  const withheldReviewDueCount = usePrayerStore(
    (state) => state.withheldReviewDueCount,
  );
  const hydrated = usePrayerStore((state) => state.hydrated);
  const reload = usePrayerStore((state) => state.reload);
  const addIntercessor = usePrayerStore((state) => state.addIntercessor);
  const updateIntercessor = usePrayerStore((state) => state.updateIntercessor);
  const removeIntercessor = usePrayerStore((state) => state.removeIntercessor);
  const revealContact = usePrayerStore((state) => state.revealContact);
  const reviewIntercessor = usePrayerStore((state) => state.reviewIntercessor);

  // Always fetched on arrival, cache or not: `reviewDue` is the server's answer for today,
  // and a list kept from last week would show last week's. The cache stays on screen
  // until the answer replaces it.
  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <IntercessoresView
      people={hydrated ? intercessors : null}
      withheldCount={withheldCount}
      withheldReviewDueCount={withheldReviewDueCount}
      canWrite={canWriteNetwork(user.roles)}
      onAdd={addIntercessor}
      onUpdate={updateIntercessor}
      onRemove={removeIntercessor}
      onRevealContact={revealContact}
      onReview={reviewIntercessor}
    />
  );
}
