import type { TFunction } from "i18next";
import { OLD_NOTICE_SUMMARY_KEYS } from "../constants/notifications";
import type { ServedNoticeFacts, ServedNotification } from "../types/notification";
import { formatMoney } from "./currency";
import { formatDate } from "./format";
import { needCategoryLabel } from "./needs";
import { getRegionLabelKey } from "./region";

function noticeWhere(facts: ServedNoticeFacts, t: TFunction): string {
  const place = facts.place;
  if (place !== null && !place.locationWithheld && place.location) return place.location;
  return facts.region === null ? "" : t(getRegionLabelKey(facts.region));
}

function urgentNeedsSummary(facts: ServedNoticeFacts, name: string, t: TFunction): string {
  const where = noticeWhere(facts, t);
  const sentence = t("notif_served_need", {
    count: facts.needCount ?? facts.needCategories.length,
    who: where ? t("notif_served_who_where", { name, where }) : name,
    categories: facts.needCategories.map((category) => needCategoryLabel(category, t)).join(", "),
  });
  if (facts.needTotals.length === 0) return sentence;
  const amounts = facts.needTotals
    .map(({ amount, currency }) => formatMoney(amount, currency, t("locale")))
    .join(", ");
  return `${sentence} ${t("notif_served_need_money", { amounts })}`;
}

/**
 * What a served project notice says, in the reader's language (OBT-559). The server answers
 * facts — what happened, the language's name as every recipient may read it, the region, and an
 * urgent need's place only to a reader who reaches the project — and this words them. A notice
 * written before the server answered facts says its kind and nothing it said.
 */
export function servedNoticeSummary(entry: ServedNotification, t: TFunction): string {
  const facts = entry.facts;
  if (facts === null) return t(OLD_NOTICE_SUMMARY_KEYS[entry.kind]);
  const opening = facts.languageName || t("notif_served_unnamed_start");
  const inside = facts.languageName || t("notif_served_unnamed");
  switch (entry.kind) {
    case "health":
      return facts.assessedOn === null
        ? t(OLD_NOTICE_SUMMARY_KEYS.health)
        : t("notif_served_health", {
            name: opening,
            date: formatDate(facts.assessedOn, t("locale")),
          });
    case "need":
      return urgentNeedsSummary(facts, opening, t);
    case "field":
      return t("notif_served_field", {
        who: facts.submittedBy || t("notif_served_team_leader"),
        name: inside,
      });
    case "prayer":
      return t("notif_served_prayer", { name: inside });
    case "stale":
      return facts.daysSinceUpdate === null
        ? t("notif_served_stale_unknown", { name: opening })
        : t("notif_served_stale", { count: facts.daysSinceUpdate, name: opening });
  }
}
