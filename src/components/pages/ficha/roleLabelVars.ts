import type { TFunction } from "i18next";
import { SESSION_ROLE_LABEL_KEYS } from "../../../contexts/AuthContext";

/**
 * The role names the ficha's privacy phrases speak of, in the reader's language: who edits
 * (`regional`, `admin`), who also reads (`circle`) and who is handed `""` (`lab`, OBT-573).
 */
export function roleLabelVars(t: TFunction) {
  return {
    regional: t(SESSION_ROLE_LABEL_KEYS.coordinator),
    admin: t(SESSION_ROLE_LABEL_KEYS.admin),
    circle: t(SESSION_ROLE_LABEL_KEYS.resourceCircle),
    lab: t(SESSION_ROLE_LABEL_KEYS.obtLab),
  };
}
