/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const WITHHELD = fileURLToPath(new URL("./src/fixtures/data/withheld/", import.meta.url));

/**
 * The fixture projects are real people in real places (INT-12 · OBT-417): 127 records from the
 * Notion export — contacts, bases, coordinates, two sensitive countries, unauthorized prayer
 * text. A build that talks to the server must not carry them, so unless the build is explicitly
 * a fixture one the two data files are swapped for empty stand-ins and never reach `dist/`.
 * `npm run check:bundle` is what proves it on every pull request.
 */
function withheldFixtureData(command: "build" | "serve", dataSource: string | undefined) {
  if (command === "serve" || dataSource === "fixtures") return [];
  return [
    { find: /^\.\/data\/projects\.json$/, replacement: `${WITHHELD}projects.json` },
    { find: /^\.\/data\/prayerSeed\.json$/, replacement: `${WITHHELD}prayerSeed.json` },
  ];
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: withheldFixtureData(command, env.VITE_DATA_SOURCE) },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      env: { TZ: "UTC", VITE_DATA_SOURCE: "fixtures" },
    },
  };
});
