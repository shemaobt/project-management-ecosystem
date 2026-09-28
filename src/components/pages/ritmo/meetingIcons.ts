import {
  Activity,
  HandHeart,
  Heart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MeetingIcon } from "../../../types/meeting";

export const MEETING_ICONS: Record<MeetingIcon, LucideIcon> = {
  pulse: Activity,
  care: HandHeart,
  heart: Heart,
  users: Users,
  spark: Sparkles,
};
