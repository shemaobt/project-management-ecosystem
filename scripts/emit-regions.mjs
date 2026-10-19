import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

/**
 * A emissão que o `shema-api` vendoriza byte a byte em `tests/test_shema/countryRegion.json`
 * (OBT-591): as duas tabelas de `src/constants/regions.ts` como dado — as 25 grafias do export
 * e os sinônimos listados para elas. Carregada pelo resolvedor do próprio app, sem regex sobre
 * TypeScript; `countryRegion.test.ts` falha quando o arquivo e as tabelas divergem.
 *
 *   npm run emit:regions
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src", "utils", "__tests__", "countryRegion.json");

const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  // Carga por SSR não pré-empacota nada: sem isto o Vite varre o `index.html` atrás de
  // dependências e reclama quando o servidor fecha antes de a varredura terminar.
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { COUNTRY_REGION, COUNTRY_SYNONYMS } = await server.ssrLoadModule(
    "/src/constants/regions.ts",
  );
  fs.writeFileSync(
    target,
    `${JSON.stringify({ countries: COUNTRY_REGION, synonyms: COUNTRY_SYNONYMS }, null, 2)}\n`,
  );
  console.log(
    `countryRegion.json: ${Object.keys(COUNTRY_REGION).length} países, ${Object.keys(COUNTRY_SYNONYMS).length} sinônimos`,
  );
} finally {
  await server.close();
}
