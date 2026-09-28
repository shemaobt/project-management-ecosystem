import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import type { InviteDescription } from "../../../types/access";
import type { ApiFailure } from "../../../types/session";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { toast } from "../../ui";
import { IntakeShell } from "../intake/IntakeShell";
import {
  failureMessage,
  toApiFailure,
  type AccessAPI,
} from "../../../services/api";
import {
  InvitationClosed,
  InvitationOpen,
  InvitationUnreachable,
} from "./ConviteView";
import {
  createsAccount,
  readInvitation,
  type ClosedReason,
  type JoinFailure,
} from "./invitation";

type Phase =
  | { kind: "loading" }
  | { kind: "closed"; reason: ClosedReason }
  | { kind: "network"; failure: ApiFailure }
  | { kind: "open"; invite: InviteDescription };

export interface ConvitePageProps {
  api: AccessAPI;
}

export function ConvitePage({ api }: ConvitePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>(
    token ? { kind: "loading" } : { kind: "closed", reason: "missing" },
  );
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<JoinFailure | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .describeInvite(token)
      .then((invite) => setPhase({ kind: "open", invite }))
      .catch((raw: unknown) => {
        const refused = toApiFailure(raw);
        setPhase(
          refused.kind === "notFound"
            ? { kind: "closed", reason: "notFound" }
            : { kind: "network", failure: refused },
        );
      });
  }, [api, token]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setPhase({ kind: "loading" });
    load();
  };

  const join = async (
    invite: InviteDescription,
    password: string,
    displayName: string | null,
  ) => {
    setWorking(true);
    setFailure(null);
    const outcome = await api.join(token, {
      email: invite.email,
      password,
      displayName,
      create: createsAccount(invite, failure),
    });
    if (!outcome.ok) {
      setFailure({
        stage: outcome.stage,
        failure: outcome.failure,
        accountCreated: outcome.accountCreated || Boolean(failure?.accountCreated),
      });
      setWorking(false);
      return;
    }
    toast.success(t("convite_accepted"));
    if (signIn) await signIn(invite.email, password);
    navigate("/", { replace: true });
  };

  const reading = phase.kind === "open" ? readInvitation(phase.invite) : null;

  return (
    <IntakeShell>
      {phase.kind === "loading" ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" label={t("convite_loading")} />
        </div>
      ) : phase.kind === "network" ? (
        <InvitationUnreachable
          message={failureMessage(phase.failure, t)}
          onRetry={retry}
        />
      ) : phase.kind === "closed" ? (
        <InvitationClosed reason={phase.reason} />
      ) : reading && !reading.open ? (
        <InvitationClosed reason={reading.reason} />
      ) : reading ? (
        <InvitationOpen
          invite={phase.invite}
          role={reading.role}
          app={reading.app}
          working={working}
          failure={failure}
          onSubmit={(password, displayName) =>
            void join(phase.invite, password, displayName)
          }
        />
      ) : null}
    </IntakeShell>
  );
}
