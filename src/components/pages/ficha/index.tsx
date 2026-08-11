import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DEFAULT_TAB,
  isRecordTab,
  RECORD_TABS,
  type RecordTabId,
} from "../../../constants/recordTabs";
import { useProjectsStore } from "../../../stores/projectsStore";
import {
  makeEmptyProject,
  NEW_RECORD,
  REQUIRED_FIELD_TAB,
  type ProjectDraft,
} from "../../../stores/recordStore";
import type { Project } from "../../../types/project";
import {
  Dialog,
  DialogBody,
  DialogContent,
  Tabs,
  TabsContent,
  toast,
} from "../../ui";
import { RecordFooter } from "./RecordFooter";
import { RecordHero } from "./RecordHero";
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

  const hydrate = useProjectsStore((state) => state.hydrate);
  const saveProject = useProjectsStore((state) => state.saveProject);

  const draft = useDraft(recordId);
  const mode = readMode(params.get(MODE_PARAM), draft.isNew);
  const active: RecordTabId = tab && isRecordTab(tab) ? tab : DEFAULT_TAB;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!tab || isRecordTab(tab)) return;
    navigate(`/ficha/${recordId}/${DEFAULT_TAB}`, { replace: true });
  }, [tab, recordId, navigate]);

  const close = () => {
    navigate("/projetos");
  };

  const goToTab = (next: string) => {
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
    toast(t("record_draft_discarded"));
    if (draft.isNew) close();
  };

  const save = () => {
    if (draft.missing.length > 0) {
      const first = draft.missing[0];
      toast.error(t("record_save_blocked"));
      goToTab(REQUIRED_FIELD_TAB[first]);
      return;
    }
    saveProject(promote(draft.values, recordId));
    draft.discard();
    toast.success(t("record_saved", { name: draft.values.languageName }));
    close();
  };

  const Tab = TAB_COMPONENTS[active];
  const pending = RECORD_TABS.filter((option) =>
    draft.missing.some((field) => REQUIRED_FIELD_TAB[field] === option),
  );

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent closeLabel={t("btn_close")}>
        <RecordHero mode={mode} draft={draft} />
        <Tabs value={active} onValueChange={goToTab}>
          <TabNav pending={mode === "editar" ? pending : []} />
          <DialogBody className="max-h-[calc(100vh-330px)] pt-6">
            {RECORD_TABS.map((option) => (
              <TabsContent key={option} value={option} className="pt-0">
                {option === active && <Tab mode={mode} draft={draft} />}
              </TabsContent>
            ))}
          </DialogBody>
        </Tabs>
        <div className="border-t border-line bg-muted px-8 py-4">
          <RecordFooter
            mode={mode}
            draft={draft}
            onEdit={startEditing}
            onSave={save}
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
  return { ...makeEmptyProject(), ...values, id };
}
