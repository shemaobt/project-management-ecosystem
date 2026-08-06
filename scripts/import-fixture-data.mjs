import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ds = path.join(root, "DS-PROJECT");
const out = path.join(root, "src", "fixtures", "data");

if (!fs.existsSync(ds)) {
  console.error(
    "DS-PROJECT/ não encontrado. Baixe o pacote de design do documento Docs do projeto no Linear e descompacte na raiz do repositório.",
  );
  process.exit(1);
}

const projectsSource = fs.readFileSync(path.join(ds, "projects.js"), "utf8");
const projects = JSON.parse(
  projectsSource.slice(
    projectsSource.indexOf("["),
    projectsSource.lastIndexOf("]") + 1,
  ),
);
fs.writeFileSync(
  path.join(out, "projects.json"),
  `${JSON.stringify(projects, null, 2)}\n`,
);

const continentsWindow = {};
new Function(
  "window",
  fs.readFileSync(path.join(ds, "continents.js"), "utf8"),
)(continentsWindow);
fs.writeFileSync(
  path.join(out, "continents.json"),
  `${JSON.stringify(continentsWindow.SHEMA_CONTINENTS)}\n`,
);

console.log(
  `projects.json: ${projects.length} projetos · continents.json: ${continentsWindow.SHEMA_CONTINENTS.length} contornos`,
);
