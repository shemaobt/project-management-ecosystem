import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ds = path.join(root, "DS-PROJECT");
const target = path.join(root, "src", "utils", "__tests__", "dataJsParity.json");

const REFERENCE_DATE = "2026-05-14";

if (!fs.existsSync(ds)) {
  console.error(
    "DS-PROJECT/ não encontrado. Baixe o pacote de design do documento Docs do projeto no Linear e descompacte na raiz do repositório.",
  );
  process.exit(1);
}

const projects = JSON.parse(
  fs.readFileSync(
    path.join(root, "src", "fixtures", "data", "projects.json"),
    "utf8",
  ),
);

const prototype = { SHEMA_PROJECTS: projects };
new Function("window", fs.readFileSync(path.join(ds, "data.js"), "utf8"))(
  prototype,
);
new Function("window", fs.readFileSync(path.join(ds, "coords.js"), "utf8"))(
  prototype,
);

const shema = prototype.SHEMA;
const encodeDays = (days) =>
  days === null ? null : Number.isNaN(days) ? "NaN" : days;

const rows = projects.map((project) => ({
  id: project.id,
  status: shema.getProjectStatus(project),
  health: shema.getOverallHealth(project),
  stale: shema.getStaleStatus(project),
  progress: shema.getProgress(project),
  priority: shema.getPriority(project),
  healthScore: shema.healthScore(project),
  daysSinceUpdate: encodeDays(shema.getDaysSinceUpdate(project)),
  lastProgressUpdate: shema.getLastProgressUpdate(project),
  region: shema.getContinent(project),
}));

fs.writeFileSync(
  target,
  `${JSON.stringify({ referenceDate: REFERENCE_DATE, projects: rows }, null, 2)}\n`,
);

console.log(`dataJsParity.json: ${rows.length} registros em ${REFERENCE_DATE}`);
