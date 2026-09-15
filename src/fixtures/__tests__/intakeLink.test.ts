import { describe, expect, it } from "vitest";
import { formsAPI, projectsAPI } from "..";

const projects = await projectsAPI.list();
const projectId = projects[0].id;

describe("o dublê do link do líder — a mesma forma da BE-12", () => {
  it("o token só aparece na resposta da criação, nunca na listagem", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    expect(created.token).toBeTruthy();
    expect(created.url).toContain(created.token);
    expect(created.status).toBe("pending");

    const listed = await formsAPI.listIntakeLinks(projectId);
    expect(listed.some((link) => link.id === created.id)).toBe(true);
    expect(JSON.stringify(listed)).not.toContain(created.token);
  });

  it("um projeto fora de alcance é recusado", async () => {
    await expect(
      formsAPI.mintIntakeLink({ projectId: "nao-existe" }),
    ).rejects.toMatchObject({ kind: "notFound" });
  });

  it("o formulário servido é o Pulso, e nada além do idioma do projeto", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    const form = await formsAPI.intakeForm(created.token);

    expect(form.kind).toBe("pulso");
    expect(form.languageName).toBe(projects[0].languageName);
    expect(form.fields.map((field) => field.key)).toEqual([
      "submittedBy",
      "period",
      "voice",
      "bookProgress",
      "blockers",
      "prayerRequest",
      "prayerVisibility",
    ]);
  });

  it("um token que este servidor nunca emitiu é recusado — sem distinguir de propósito", async () => {
    await expect(formsAPI.intakeForm("token-que-nao-existe")).rejects.toMatchObject(
      { kind: "notFound" },
    );
  });

  it("revogar diz que revogou, e o link revogado para de servir o formulário", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    const revoked = await formsAPI.revokeIntakeLink(created.id);
    expect(revoked.status).toBe("revoked");

    await expect(formsAPI.intakeForm(created.token)).rejects.toMatchObject({
      detail: expect.stringContaining("revoked"),
    });
  });

  it("revogar duas vezes não é erro, e mantém a mesma data", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    const first = await formsAPI.revokeIntakeLink(created.id);
    const second = await formsAPI.revokeIntakeLink(created.id);

    expect(second.revokedAt).toBe(first.revokedAt);
  });

  it("uma submissão sem os campos obrigatórios é recusada inteira", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    await expect(
      formsAPI.submitIntake(created.token, {
        definitionVersion: created.definitionVersion,
        answers: {},
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("uma submissão válida é aceita, e o link deixa de estar pendente", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });

    await formsAPI.submitIntake(created.token, {
      definitionVersion: created.definitionVersion,
      answers: { submittedBy: "Kuaray", period: "2026-09" },
    });

    const listed = await formsAPI.listIntakeLinks(projectId);
    const found = listed.find((link) => link.id === created.id);
    expect(found?.status).toBe("used");

    const received = await formsAPI.received();
    expect(
      received.some(
        (submission) =>
          submission.projectId === projectId &&
          submission.submittedBy === "Kuaray",
      ),
    ).toBe(true);
  });
});
