import { PRAYER_REVIEW_ROLES } from "../constants/prayer";
import { useAuth } from "../contexts/AuthContext";
import { prayerReviewAPI } from "../services/api";

/**
 * Whether this session is offered the review queue (OBT-575): the coordination, and only against
 * the server, which decides region by region who may release.
 */
export function useReviewsPrayer(): boolean {
  const { user } = useAuth();
  return (
    prayerReviewAPI !== null &&
    PRAYER_REVIEW_ROLES.some((role) => user.roles.includes(role))
  );
}
