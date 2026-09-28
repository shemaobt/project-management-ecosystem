import type { AccessAppKey } from "../../../types/access";
import type { SessionRole } from "../../../types/session";

export function roleRow(app: AccessAppKey, role: SessionRole): string {
  return `${app}:${role}`;
}
