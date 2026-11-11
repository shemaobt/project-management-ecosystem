import { toast } from "sonner";
import type { PrayerPulseFile, Translate } from "../../../services/api";
import { downloadTextFile } from "../../../utils/export";

/**
 * Saves the Prayer Pulse under the name the server gave it, as the HTML it is (OBT-690), and
 * says so: the dialog closes on the click, and a save that ends in silence leaves whoever saved
 * not knowing a file was made (OBT-694, item 13 — the round of 6/nov, OBT-417-R3b). The browser
 * owns where the file lands, so the notice names the file and not a folder it cannot know.
 */
export function savePulse(file: PrayerPulseFile, t: Translate): void {
  downloadTextFile(file.fileName, file.text, "text/html;charset=utf-8");
  toast.success(t("oracao_pulse_saved", { name: file.fileName }));
}
