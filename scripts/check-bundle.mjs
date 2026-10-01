// The production bundle carries none of the fixture projects (INT-12 · OBT-417).
// Run after `npm run build` with no VITE_DATA_SOURCE: every fixture id is a sentinel, and the
// two sensitive projects' bases are checked by name, so a regression fails loudly here instead
// of shipping real people's places to every visitor.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const projects = JSON.parse(readFileSync("src/fixtures/data/projects.json", "utf8"));
const sentinels = new Set(projects.map((project) => `"${project.id}"`));
for (const project of projects) {
  if (project.sensitiveCountry && project.ywamBase) sentinels.add(project.ywamBase);
}

const assets = join("dist", "assets");
const leaks = [];
for (const file of readdirSync(assets).filter((name) => name.endsWith(".js"))) {
  const code = readFileSync(join(assets, file), "utf8");
  const found = [...sentinels].filter((sentinel) => code.includes(sentinel));
  if (found.length > 0) leaks.push(`${file}: ${found.length} (${found.slice(0, 3).join(", ")})`);
}

if (leaks.length > 0) {
  console.error("fixture project data reached the production bundle:\n" + leaks.join("\n"));
  process.exit(1);
}
console.log(`check:bundle — ${sentinels.size} sentinels, none in dist/assets`);
