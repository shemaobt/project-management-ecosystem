import { useAuth } from "../contexts/AuthContext";
import { canReadNetwork } from "../utils/access";

/** Whether this session is offered the Intercessores tab — the roles the server lets read the network. */
export function useReadsNetwork(): boolean {
  const { user } = useAuth();
  return canReadNetwork(user.roles);
}
