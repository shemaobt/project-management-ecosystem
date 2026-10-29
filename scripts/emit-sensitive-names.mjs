import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

/**
 * A emissão que o `shema-api` vendoriza byte a byte em `app/utils/shema_sensitive_project_names.json`
 * (OBT-657): o nome que a tela imprime no lugar da chave da região, por região e por língua,
 * escrito pela própria `getLanguageNameDisplay` sobre os catálogos. Carregada pelo resolvedor do
 * próprio app, como a de `emit-regions.mjs`; `sensitiveProjectNames.test.ts` falha quando o arquivo
 * e os catálogos divergem.
 *
 *   npm run emit:sensitive-names
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src", "utils", "__tests__", "sensitiveProjectNames.json");

const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { emitSensitiveProjectNames } = await server.ssrLoadModule(
    "/src/utils/__tests__/emitSensitiveProjectNames.ts",
  );
  const emission = emitSensitiveProjectNames();
  fs.writeFileSync(target, emission);
  const languages = Object.entries(JSON.parse(emission));
  console.log(
    `sensitiveProjectNames.json: ${languages.map(([language, names]) => `${language} ${Object.keys(names).length}`).join(", ")}`,
  );
} finally {
  await server.close();
}
