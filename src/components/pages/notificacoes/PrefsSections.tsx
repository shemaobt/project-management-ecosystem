import { useTranslation } from "react-i18next";
import {
  isNotificationScope,
  isNotificationWhen,
  NOTIFICATION_CHANNEL_OPTIONS,
  NOTIFICATION_SCOPE_OPTIONS,
  NOTIFICATION_WHEN_OPTIONS,
} from "../../../constants/notifications";
import type {
  NotificationPrefs,
  NotificationPrefsHandlers,
} from "../../../types/notification";
import type { Project } from "../../../types/project";
import { cn } from "../../../utils/cn";
import {
  CheckboxField,
  Radio,
  RadioButton,
  RadioGroup,
  Switch,
} from "../../ui";

export interface PrefsSectionProps {
  prefs: NotificationPrefs;
  handlers: NotificationPrefsHandlers;
}

export function MasterSwitch({ prefs, handlers }: PrefsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex items-center gap-3.5 rounded-[18px] bg-inverse px-4.5 py-4 text-on-dark">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-branco/[0.12] text-[18px]"
      >
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-[1.2] font-bold">
          {t("notif_master_title")}
        </p>
        <p className="mt-1 text-micro leading-[1.3] font-medium text-on-dark/70">
          {t(prefs.enabled ? "notif_master_on" : "notif_master_off")} ·{" "}
          {t("notif_master_scope")}
        </p>
      </div>
      <Switch
        size="lg"
        checked={prefs.enabled}
        onCheckedChange={handlers.setEnabled}
        aria-label={t("notif_master_title")}
        className="bg-branco/25 data-[state=checked]:bg-telha"
      />
    </div>
  );
}

export function ChannelsSection({ prefs, handlers }: PrefsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      {NOTIFICATION_CHANNEL_OPTIONS.map((channel) => {
        const on = prefs.channels[channel.key];
        return (
          <div
            key={channel.key}
            className={cn(
              "flex items-center gap-3 rounded-md border border-line bg-elevated px-3.5 py-3",
              on && "border-telha bg-accent-soft",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-muted text-[16px]",
                on && "bg-telha text-on-brand",
              )}
            >
              {channel.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-[1.2] font-semibold text-fg-strong">
                {t(channel.labelKey)}
              </p>
              {channel.subKey && (
                <p className="mt-0.5 text-micro leading-[1.3] text-fg-muted">
                  {t(channel.subKey)}
                </p>
              )}
              {channel.addr && (
                <input
                  aria-label={t(channel.labelKey)}
                  placeholder={t(channel.labelKey)}
                  className="mt-0.5 w-full bg-transparent text-[12px] leading-[1.2] font-medium text-fg-muted placeholder:text-fg-subtle focus:text-fg-strong"
                  value={prefs[channel.addr]}
                  onChange={(event) =>
                    channel.addr === "emailAddr"
                      ? handlers.setEmailAddr(event.target.value)
                      : handlers.setPhoneAddr(event.target.value)
                  }
                />
              )}
            </div>
            <Switch
              checked={on}
              onCheckedChange={() => handlers.toggleChannel(channel.key)}
              aria-label={t(channel.labelKey)}
            />
          </div>
        );
      })}
      <p className="mt-0.5 text-micro leading-[1.45] text-fg-subtle">
        {t("notif_channels_hint")}
      </p>
    </div>
  );
}

export function WhenSection({ prefs, handlers }: PrefsSectionProps) {
  const { t } = useTranslation();

  return (
    <RadioGroup
      value={prefs.when}
      onValueChange={(value) => {
        if (isNotificationWhen(value)) handlers.setWhen(value);
      }}
      className="flex-col gap-2"
      aria-label={t("notif_sec_when")}
    >
      {NOTIFICATION_WHEN_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-md border-[1.5px] border-line bg-elevated px-3.5 py-3",
            prefs.when === option.value && "border-telha bg-accent-soft",
          )}
        >
          <Radio value={option.value} className="mt-0.5" />
          <span className="min-w-0">
            <span className="block text-[13px] leading-[1.2] font-semibold text-fg-strong">
              {t(option.labelKey)}
            </span>
            <span className="mt-0.5 block text-[12px] leading-[1.4] text-fg-muted">
              {t(option.subKey)}
            </span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

export interface ScopeSectionProps extends PrefsSectionProps {
  projects: readonly Project[];
}

export function ScopeSection({ prefs, handlers, projects }: ScopeSectionProps) {
  const { t } = useTranslation();

  const picker = [...projects].sort((a, b) =>
    a.languageName.localeCompare(b.languageName),
  );
  const chosen = prefs.customProjectIds.filter((id) =>
    projects.some((project) => project.id === id),
  ).length;

  return (
    <div className="flex flex-col gap-2">
      <RadioGroup
        value={prefs.scope}
        onValueChange={(value) => {
          if (isNotificationScope(value)) handlers.setScope(value);
        }}
        className="flex-col gap-2"
        aria-label={t("notif_sec_scope")}
      >
        {NOTIFICATION_SCOPE_OPTIONS.map((option) => {
          const active = prefs.scope === option.value;
          return (
            <RadioButton
              key={option.value}
              value={option.value}
              className={cn(
                "flex items-center gap-3 rounded-md border border-line bg-elevated px-3.5 py-3 text-left",
                active && "border-verde bg-verde/[0.04]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5.5 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-elevated text-[12px] leading-none font-bold",
                  active && "border-verde bg-inverse text-on-dark",
                )}
              >
                {active ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-[1.2] font-semibold text-fg-strong">
                  {t(option.labelKey)}
                </span>
                <span className="mt-0.5 block text-[12px] leading-[1.3] text-fg-muted">
                  {t(option.subKey)}
                </span>
              </span>
            </RadioButton>
          );
        })}
      </RadioGroup>
      {prefs.scope === "custom" && (
        <>
          <div className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-md border border-line bg-elevated px-3.5 py-2.5">
            {picker.map((project) => (
              <CheckboxField
                key={project.id}
                label={`${project.languageName || "—"} · ${
                  project.team || project.ywamBase || "—"
                }`}
                checked={prefs.customProjectIds.includes(project.id)}
                onCheckedChange={() => handlers.toggleCustomProject(project.id)}
              />
            ))}
          </div>
          <p className="text-micro leading-none text-fg-subtle">
            {t("notif_custom_count", { count: chosen })}
          </p>
        </>
      )}
    </div>
  );
}

export function PreviewCard() {
  const { t } = useTranslation();

  return (
    <div className="rounded-[16px] border border-line bg-elevated px-4 py-3.5 shadow-md">
      <div className="mb-2 flex items-center gap-2 text-[11px] leading-none font-semibold tracking-button text-fg-subtle uppercase">
        <span aria-hidden className="text-[8px] text-telha">
          ●
        </span>
        <span>{t("notif_preview_app")}</span>
        <span className="ml-auto normal-case tracking-normal">
          {t("notif_preview_now")}
        </span>
      </div>
      <p className="mb-1 text-[14px] leading-[1.3] font-bold text-fg-strong">
        {t("notif_preview_title")}
      </p>
      <p className="text-[13px] leading-[1.4] text-fg-muted">
        <strong className="font-bold">{t("notif_preview_project")}</strong> —{" "}
        {t("notif_preview_body")}
      </p>
    </div>
  );
}
