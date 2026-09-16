import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const workflow = read(".github/workflows/deploy.yml");
const entrypoint = read("docker-entrypoint.sh");
const nginx = read("nginx.conf");
const dockerfile = read("Dockerfile");

const workflowEnv = (name: string): string => {
  const match = workflow.match(new RegExp(`^\\s{2}${name}:\\s*(\\S+)\\s*$`, "m"));
  if (!match) throw new Error(`${name} is not declared in the workflow env block`);
  return match[1];
};

const stepRun = (name: string): string => {
  const start = workflow.indexOf(`- name: ${name}`);
  if (start < 0) throw new Error(`the workflow has no step named "${name}"`);
  const rest = workflow.slice(start + 1);
  const end = rest.indexOf("\n      - name: ");
  return end < 0 ? rest : rest.slice(0, end);
};

describe("o deploy no Cloud Run não pode ficar público", () => {
  it("faz deploy com --no-allow-unauthenticated", () => {
    expect(stepRun("Deploy to Cloud Run")).toContain("--no-allow-unauthenticated");
  });

  it("não carrega nenhum --allow-unauthenticated solto", () => {
    expect(workflow.split("--no-allow-unauthenticated").join("")).not.toContain("--allow-unauthenticated");
  });

  it("relê a política de IAM depois do deploy e reprova allUsers e allAuthenticatedUsers", () => {
    const guard = stepRun("Assert the service is not publicly reachable");
    expect(guard).toContain("get-iam-policy");
    expect(guard).toContain("allUsers");
    expect(guard).toContain("allAuthenticatedUsers");
    expect(guard).toContain("exit 1");
  });
});

describe("o segredo chega pelo arquivo que o entrypoint lê", () => {
  it("monta o segredo no caminho que docker-entrypoint.sh carrega", () => {
    const loaded = entrypoint.match(/\[ -f (\S+) \]/);
    expect(loaded).not.toBeNull();
    expect(workflowEnv("SECRET_MOUNT_PATH")).toBe(loaded?.[1]);
    expect(stepRun("Deploy to Cloud Run")).toContain('--set-secrets "${SECRET_MOUNT_PATH}=');
  });

  it("aponta para o projeto de segredos da org pelo nome completo do recurso", () => {
    expect(workflowEnv("SECRETS_PROJECT")).toBe("shemaobt-secrets");
    const deploy = stepRun("Deploy to Cloud Run");
    expect(deploy).toContain('SECRETS_REF="${SECRETS_PROJECT_REF:-${SECRETS_PROJECT}}"');
    expect(deploy).toContain("projects/${SECRETS_REF}/secrets/${SECRET_NAME}:latest");
  });

  it("não passa o valor por variável de ambiente", () => {
    expect(workflow).not.toContain("--set-env-vars");
    expect(workflow).not.toContain("BACKEND_URL");
  });
});

describe("a imagem é endereçada por tag imutável", () => {
  it("constrói a tag do SHA do commit", () => {
    expect(stepRun("Resolve target image")).toContain('TAG="${GITHUB_SHA}"');
  });

  it("recusa 'latest' como alvo de rollback", () => {
    expect(stepRun("Resolve target image")).toContain('if [ "${TAG}" = "latest" ]');
  });

  it("faz deploy da tag resolvida, nunca de um literal", () => {
    expect(stepRun("Deploy to Cloud Run")).toContain('--image "${IMAGE}"');
  });

  it("pula build e push quando o rollback nomeia uma tag existente", () => {
    expect(workflow).toContain("if: steps.target.outputs.build == 'true'");
    expect(stepRun("Verify requested image exists")).toContain("gcloud artifacts docker images describe");
  });
});

describe("a porta publicada é a que a imagem serve", () => {
  it("nginx, Dockerfile e Cloud Run falam da mesma porta", () => {
    const served = nginx.match(/listen\s+(\d+);/)?.[1];
    expect(served).toBeTruthy();
    expect(dockerfile).toContain(`EXPOSE ${served}`);
    expect(stepRun("Deploy to Cloud Run")).toContain(`--port ${served}`);
  });
});

describe("a região é a da casa", () => {
  it("us-central1 no env e no host do Artifact Registry", () => {
    expect(workflowEnv("REGION")).toBe("us-central1");
    expect(workflow).toContain("${REGION}-docker.pkg.dev");
  });
});
