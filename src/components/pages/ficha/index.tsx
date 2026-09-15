import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DEFAULT_TAB,
  isRecordTab,
  RECORD_TABS,
  type RecordTabId,
} from "../../../constants/recordTabs";
import { failureMessage } from "../../../services/api";
import {
  tabOfFirstError,
  useProjectRecordStore,
} from "../../../stores/projectRecordStore";
import {
  materializeDraft,
  NEW_RECORD,
  REQUIRED_FIELD_TAB,
  useRecordStore,
  type ProjectDraft,
} from "../../../stores/recordStore";
import type { Project } from "../../../types/project";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  Tabs,
  TabsContent,
  toast,
} from "../../ui";
import { RecordFooter } from "./RecordFooter";
import { RecordHero } from "./RecordHero";
import { SaveOutcomeNote } from "./SaveOutcomeNote";
import { savedSentence, unchangedSentence } from "./saveReport";
import { TabNav } from "./TabNav";
import { TAB_COMPONENTS } from "./tabs";
import type { RecordMode } from "./types";
import { useDraft } from "./useDraft";

const MODE_PARAM = "modo";

function readMode(raw: string | null, isNew: boolean): RecordMode {
  if (isNew) return "editar";
  return raw === "editar" ? "editar" : "ver";
}

export function FichaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { recordId = NEW_RECORD, tab } = useParams();
  const [params, setParams] = useSearchParams();

  const open = useProjectRecordStore((state) => state.open);
  const reload = useProjectRecordStore((state) => state.reload);
  const forget = useProjectRecordStore((state) => state.forget);
  const save = useProjectRecordStore((state) => state.save);
  const dismiss = useProjectRecordStore((state) => state.dismiss);
  const record = useProjectRecordStore((state) => state.record);
  const loadError = useProjectRecordStore((state) => state.loadError);
  const saving = useProjectRecordStore((state) => state.saving);
  const outcome = useProjectRecordStore((state) => state.outcome);
  const settleDraft = useRecordStore((state) => state.settleDraft);

  const moveDraft = useRecordStore((state) => state.updateDraft);
  const dropDraft = useRecordStore((state) => state.discardDraft);

  const draft = useDraft(recordId);
  const mode = readMode(params.get(MODE_PARAM), draft.isNew);
  const active: RecordTabId = tab && isRecordTab(tab) ? tab : DEFAULT_TAB;

  useEffect(() => {
    if (recordId === NEW_RECORD) {
      forget();
      return;
    }
    void open(recordId);
  }, [recordId, open, forget]);

  useEffect(() => {
    if (!tab || isRecordTab(tab)) return;
    navigate(`/ficha/${recordId}/${DEFAULT_TAB}`, { replace: true });
  }, [tab, recordId, navigate]);

  const close = () => {
    navigate("/projetos");
  };

  const goToTab = (next: RecordTabId) => {
    const search = params.toString();
    navigate(`/ficha/${recordId}/${next}${search ? `?${search}` : ""}`);
  };

  const startEditing = () => {
    const next = new URLSearchParams(params);
    next.set(MODE_PARAM, "editar");
    setParams(next, { replace: true });
  };

  /**
   * Forget what the server took; carry what it does not take yet to where the record now
   * lives.
   *
   * A create leaves the draft keyed by `novo`, and anything still in it would greet the
   * *next* new record as if it belonged to it. So the remainder moves to the minted slug
   * and the `novo` key is dropped — the input survives, under the record that is now its
   * own.
   */
  const carryDraft = (
    key: string,
    mintedId: string | null,
    written: { writtenFields: (keyof Project)[]; withheld: (keyof Project)[] },
  ) => {
    if (!mintedId) {
      settleDraft(key, written.writtenFields);
      return;
    }
    const kept: ProjectDraft = {};
    for (const field of written.withheld) {
      Object.assign(kept, { [field]: draft.values[field] });
    }
    if (Object.keys(kept).length > 0) moveDraft(mintedId, kept);
    dropDraft(key);
  };

  const discard = () => {
    draft.discard();
    dismiss();
    toast(t("record_draft_discarded"));
    if (draft.isNew) close();
  };

  /**
   * One attempt, four answers — and the draft survives all four.
   *
   * Only a save the server accepted takes anything out of the draft, and it takes
   * exactly the tabs it wrote (`settleDraft`): a conflict, a refusal and a dead
   * connection all leave every keystroke where it was, which is what lets the same
   * button be pressed again.
   */
  const attempt = async () => {
    if (draft.missing.length > 0) {
      const first = draft.missing[0];
      toast.error(t("record_save_blocked"));
      goToTab(REQUIRED_FIELD_TAB[first]);
      return;
    }

    // The slug is minted **once** and kept in the draft. A create that timed out may
    // well have landed, and a retry that minted a second id would file the record twice
    // instead of meeting the server's own slug collision.
    const filed = draft.isNew ? promote(draft.values) : null;
    if (filed && filed.id !== draft.values.id) draft.set("id", filed.id);

    const result = await save({
      values: filed ?? draft.values,
      typed: draft.typed,
      isNew: draft.isNew,
    });

    switch (result.kind) {
      case "saved": {
        // A create wrote the whole record, so naming ten tabs says nothing; a patch
        // names the ones it touched. Either way the withheld half is named, because
        // that is the part the coordinator would otherwise believe had landed.
        const written = filed ? [] : result.report.written;
        carryDraft(recordId, filed?.id ?? null, result.report);
        toast.success(
          [
            t("record_saved", { name: draft.values.languageName }),
            savedSentence(written, result.report.withheld, t),
          ]
            .filter(Boolean)
            .join(" "),
        );
        close();
        return;
      }
      case "unchanged": {
        // Nothing reached the server: no success, and the modal stays open. If the only
        // thing typed was a tab the record write does not carry yet, that is what the
        // sentence says — the same wording a real save uses for its withheld half.
        toast(unchangedSentence(result.withheld, t));
        return;
      }
      case "invalid": {
        const target = tabOfFirstError(result.errors);
        if (target && target !== active) goToTab(target);
        return;
      }
      default:
        return;
    }
  };

  if (!draft.isNew && !record) {
    return (
      <Dialog open onOpenChange={(next) => !next && close()}>
        <DialogContent closeLabel={t("btn_close")}>
          <RecordHero mode={mode} draft={draft} />
          <DialogBody className="flex justify-center py-20">
            {loadError ? (
              <EmptyState
                title={
                  loadError.kind === "notFound"
                    ? t("record_not_found_title")
                    : undefined
                }
                message={failureMessage(loadError, t)}
                action={
                  loadError.kind === "notFound" ? undefined : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void reload()}
                    >
                      {t("net_retry")}
                    </Button>
                  )
                }
              />
            ) : (
              <LoadingSpinner size="lg" label={t("record_loading")} />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  const Tab = TAB_COMPONENTS[active];
  const pending = RECORD_TABS.filter((option) =>
    draft.missing.some((field) => REQUIRED_FIELD_TAB[field] === option),
  );

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent closeLabel={t("btn_close")}>
        <RecordHero mode={mode} draft={draft} />
        <Tabs
          value={active}
          onValueChange={(next) => isRecordTab(next) && goToTab(next)}
        >
          <TabNav pending={mode === "editar" ? pending : []} />
          <DialogBody className="max-h-[calc(100vh-330px)] pt-6">
            {outcome && (
              <div className="mb-5">
                <SaveOutcomeNote
                  outcome={outcome}
                  saving={saving}
                  onRetry={() => void attempt()}
                  onGoToTab={goToTab}
                />
              </div>
            )}
            {RECORD_TABS.map((option) => (
              <TabsContent key={option} value={option} className="pt-0">
                {option === active && (
                  <Tab key={recordId} mode={mode} draft={draft} />
                )}
              </TabsContent>
            ))}
          </DialogBody>
        </Tabs>
        <div className="border-t border-line bg-muted px-8 py-4">
          <RecordFooter
            mode={mode}
            draft={draft}
            saving={saving}
            onEdit={startEditing}
            onSave={() => void attempt()}
            onDiscard={discard}
            onClose={close}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function promote(values: ProjectDraft): Project {
  return materializeDraft(values, values.id || crypto.randomUUID());
}
