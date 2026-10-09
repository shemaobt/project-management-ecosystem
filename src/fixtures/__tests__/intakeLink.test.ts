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
      // The image, its description and the authorization of its use (OBT-578 / OBT-580).
      "image",
      "imageDescription",
      "imageAuthorized",
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

describe("o dublê da imagem do Pulso — a mesma forma da shema-api#713 (OBT-580)", () => {
  const webp = () => new Blob([new Uint8Array([82, 73, 70, 70])], { type: "image/webp" });

  const answers = (image?: string) => ({
    submittedBy: "Fresia",
    period: "2026-09",
    ...(image ? { image, imageDescription: "A equipe no vale", imageAuthorized: true } : {}),
  });

  it("sobe pelo link e responde só o id; a resposta leva o id e a caixa de entrada o lê de volta", async () => {
    const created = await formsAPI.mintIntakeLink({ projectId });
    const stored = await formsAPI.uploadIntakeImage(created.token, webp(), "vale.webp");
    expect(stored.id).toMatch(/^intake-image-/);
    expect(stored.contentType).toBe("image/webp");
    expect(Object.keys(stored).sort()).toEqual(["contentType", "fileName", "id"]);

    await formsAPI.submitIntake(created.token, { definitionVersion: 1, answers: answers(stored.id) });
    const received = await formsAPI.received();
    const mine = received[received.length - 1];
    const detail = await formsAPI.readSubmission(mine.id);
    expect(detail.answers.image).toBe(stored.id);
    expect(detail.answers.imageDescription).toBe("A equipe no vale");
    expect(detail.answers.imageAuthorized).toBe(true);
    expect(detail.answersWithheld).toBe(false);
    expect(detail.fields.map((field) => field.key)).toContain("imageAuthorized");
  });

  it("um id que não subiu por este link é recusado, e a caixa que não é true/false também", async () => {
    const a = await formsAPI.mintIntakeLink({ projectId });
    const b = await formsAPI.mintIntakeLink({ projectId });
    const stored = await formsAPI.uploadIntakeImage(a.token, webp(), "vale.webp");

    await expect(
      formsAPI.submitIntake(b.token, { definitionVersion: 1, answers: answers(stored.id) }),
    ).rejects.toMatchObject({ kind: "invalid", detail: expect.stringContaining("image:") });
    await expect(
      formsAPI.submitIntake(a.token, {
        definitionVersion: 1,
        answers: { ...answers(stored.id), imageAuthorized: "sim" },
      }),
    ).rejects.toMatchObject({ kind: "invalid", detail: expect.stringContaining("imageAuthorized:") });
  });

  it("uma imagem já presa a um Pulso não serve a outro", async () => {
    const link = await formsAPI.mintIntakeLink({ projectId });
    const stored = await formsAPI.uploadIntakeImage(link.token, webp(), "vale.webp");
    await formsAPI.submitIntake(link.token, { definitionVersion: 1, answers: answers(stored.id) });
    const again = await formsAPI.mintIntakeLink({ projectId });
    await expect(
      formsAPI.submitIntake(again.token, { definitionVersion: 1, answers: answers(stored.id) }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });
});
