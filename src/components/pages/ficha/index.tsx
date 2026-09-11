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
import { savedSentence } from "./saveReport";
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

    const result = await save(
      draft.isNew ? promote(draft.values, recordId) : draft.values,
      draft.isNew,
    );

    switch (result.kind) {
      case "saved": {
        settleDraft(recordId, result.report.writtenFields);
        toast.success(
          [
            t("record_saved", { name: draft.values.languageName }),
            savedSentence(result.report.written, result.report.withheld, t),
          ]
            .filter(Boolean)
            .join(" "),
        );
        close();
        return;
      }
      case "unchanged":
        toast(t("record_no_changes"));
        return;
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

function promote(values: ProjectDraft, recordId: string): Project {
  const id = recordId === NEW_RECORD ? crypto.randomUUID() : recordId;
  return materializeDraft(values, id);
}
