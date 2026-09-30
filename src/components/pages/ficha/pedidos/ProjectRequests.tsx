import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ADMIN_ROLE } from "../../../../constants/access";
import { useAuth } from "../../../../contexts/AuthContext";
import { useResourceForm } from "../../../../hooks/useResourceForm";
import {
  failureMessage,
  membersAPI,
  toApiFailure,
  type ResourceRequestsAPI,
} from "../../../../services/api";
import type { RequestCard } from "../../../../types/request";
import type { ApiFailure } from "../../../../types/session";
import {
  projectContext,
  requestAction,
  startPermission,
} from "../../../../utils/requests";
import { RequestButton } from "./RequestButton";
import { RequestsPanel } from "./RequestsPanel";

export interface ProjectRequestsProps {
  api: ResourceRequestsAPI;
  projectId: string;
}

export function ProjectRequests({ api, projectId }: ProjectRequestsProps) {
  const { t } = useTranslation();
  const { user, apps } = useAuth();
  const admin = user.roles.includes(ADMIN_ROLE);
  const [cards, setCards] = useState<readonly RequestCard[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [memberOf, setMemberOf] = useState<readonly string[] | null>(null);
  const [membershipFailed, setMembershipFailed] = useState(false);
  const [membershipReads, setMembershipReads] = useState(0);
  const { open, opening } = useResourceForm(apps.resourceRequestForm);

  useEffect(() => {
    let cancelled = false;
    api
      .projectRequests(projectId)
      .then((result) => {
        if (!cancelled) setCards(result);
      })
      .catch((raw: unknown) => {
        if (!cancelled) setFailure(toApiFailure(raw));
      });
    return () => {
      cancelled = true;
    };
  }, [api, projectId]);

  useEffect(() => {
    if (admin) return;
    let cancelled = false;
    membersAPI
      .mine()
      .then((refs) => {
        if (!cancelled) setMemberOf(refs.map((ref) => ref.id));
      })
      .catch(() => {
        if (!cancelled) setMembershipFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, membershipReads]);

  const rereadMembership = () => {
    setMemberOf(null);
    setMembershipFailed(false);
    setMembershipReads((count) => count + 1);
  };

  const permission = startPermission(user.roles, memberOf, membershipFailed, projectId);
  const action =
    cards === null || failure !== null ? null : requestAction(cards, permission);

  return (
    <RequestsPanel
      cards={cards}
      error={failure ? failureMessage(failure, t) : null}
      action={
        <RequestButton
          action={action}
          formAvailable={apps.resourceRequestForm !== null}
          opening={opening}
          onOpen={() => void open(projectContext(projectId))}
          onRetry={rereadMembership}
        />
      }
    />
  );
}
