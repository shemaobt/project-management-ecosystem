import type { PrayerPulseFile } from "../../../services/api";
import { downloadTextFile } from "../../../utils/export";

/** Saves the Prayer Pulse under the name the server gave it, as the HTML it is (OBT-690). */
export function savePulse(file: PrayerPulseFile): void {
  downloadTextFile(file.fileName, file.text, "text/html;charset=utf-8");
}
