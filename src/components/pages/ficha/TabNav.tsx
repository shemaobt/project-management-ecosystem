import { useTranslation } from "react-i18next";
import {
  RECORD_TABS,
  TAB_LABEL_KEYS,
  TAB_MARKER_TONES,
  tabNumber,
  type RecordTabId,
} from "../../../constants/recordTabs";
import { transitionAll } from "../../../styles";
import { cn } from "../../../utils/cn";
import { TabsList, TabsTrigger } from "../../ui";

export interface TabNavProps {
  pending: readonly RecordTabId[];
}

export function TabNav({ pending }: TabNavProps) {
  const { t } = useTranslation();

  return (
    <TabsList className="gap-1.5 border-b border-line bg-muted px-8 py-3.5">
      {RECORD_TABS.map((tab) => (
        <TabsTrigger
          key={tab}
          value={tab}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border border-line bg-elevated px-3 py-1.5",
            "text-tag font-semibold tracking-[0.04em] whitespace-nowrap text-fg normal-case",
            transitionAll,
            "hover:border-telha hover:text-telha",
            "data-[state=active]:border-telha data-[state=active]:bg-accent-soft data-[state=active]:text-telha",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-flex size-4.5 items-center justify-center rounded-pill text-[10px] font-bold",
              TAB_MARKER_TONES[tab],
            )}
          >
            {tabNumber(tab)}
          </span>
          {t(TAB_LABEL_KEYS[tab])}
          {pending.includes(tab) && (
            <span
              aria-label={t("record_required_here")}
              title={t("record_required_here")}
              className="size-1.5 rounded-pill bg-telha"
            />
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
