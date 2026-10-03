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

describe("o deploy no Cloud Run é público, como os outros frontends da org", () => {
  it("faz deploy com --allow-unauthenticated", () => {
    expect(stepRun("Deploy to Cloud Run")).toContain("--allow-unauthenticated");
    expect(workflow).not.toContain("--no-allow-unauthenticated");
  });

  it("confere pela URL que o serviço responde 200 sem credencial, e nomeia o 403 como falha de IAM", () => {
    const guard = stepRun("Verify the service is publicly reachable");
    expect(guard).toContain("curl");
    expect(guard).toContain('"$STATUS" = "403"');
    expect(guard).toContain('"$STATUS" != "200"');
    expect(guard).toContain("exit 1");
  });

  it("confere que /api é respondido pelo backend e não pelo fallback da SPA", () => {
    const guard = stepRun("Verify the service is publicly reachable");
    expect(guard).toContain("/api/shema/session");
    expect(guard).toContain('<div id="root">');
  });
});

describe("o CI autentica por Workload Identity Federation, sem chave estática", () => {
  it("não carrega chave JSON de service account", () => {
    expect(workflow).not.toContain("credentials_json");
    expect(workflow).not.toContain("GCP_SA_KEY");
  });

  it("pede o token OIDC do job e o troca pela identidade do deployer", () => {
    expect(workflow).toContain("id-token: write");
    const auth = stepRun("Google Auth");
    expect(auth).toContain("id: auth");
    expect(auth).toContain("workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}");
    expect(auth).toContain("service_account: ${{ secrets.GCP_WORKLOAD_IDENTITY_SERVICE_ACCOUNT }}");
  });

  it("entra no Artifact Registry com o access token da identidade federada", () => {
    const login = stepRun("Login to Artifact Registry");
    expect(login).toContain("username: oauth2accesstoken");
    expect(login).toContain("password: ${{ steps.auth.outputs.access_token }}");
    expect(workflow).not.toContain("gcloud auth configure-docker");
  });
});

describe("o segredo chega pelo arquivo que o entrypoint lê", () => {
  it("monta o segredo no caminho que docker-entrypoint.sh carrega", () => {
    const loaded = entrypoint.match(/\[ -f (\S+) \]/);
    expect(loaded).not.toBeNull();
    expect(workflowEnv("SECRET_MOUNT_PATH")).toBe(loaded?.[1]);
    expect(stepRun("Deploy to Cloud Run")).toContain('--set-secrets "${SECRET_MOUNT_PATH}=');
  });

  it("aponta para o projeto de segredos da org pelo número, exigido antes de qualquer build", () => {
    expect(stepRun("Check required secrets")).toContain("GCP_SECRETS_PROJECT_REF is not set");
    const deploy = stepRun("Deploy to Cloud Run");
    expect(deploy).toContain("projects/${SECRETS_PROJECT_REF}/secrets/${SECRET_NAME}:latest");
    expect(deploy).not.toContain(":-");
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
