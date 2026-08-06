import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "DS-PROJECT"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/stores/**/*.{ts,tsx}",
      "src/services/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/fixtures/*", "**/fixtures/**"],
              message:
                "As telas leem a camada de fixtures por um único módulo: importe de src/fixtures (o índice), nunca um arquivo interno.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.tsx", "src/components/common/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Hex cru não é permitido em src. Use um token do design system (src/index.css @theme).",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Hex cru não é permitido em src. Use um token do design system (src/index.css @theme).",
        },
        {
          selector:
            "Literal[value=/(bg|text|border|ring|outline|fill|stroke|divide|from|via|to)-(slate|gray|grey|zinc|neutral|stone)-[0-9]{2,3}/]",
          message:
            "Cinzas genéricos do Tailwind não são permitidos. Use a paleta Shemá (areia, azul, verde, telha) ou a camada semântica (fg-muted, fg-subtle, line).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(bg|text|border|ring|outline|fill|stroke|divide|from|via|to)-(slate|gray|grey|zinc|neutral|stone)-[0-9]{2,3}/]",
          message:
            "Cinzas genéricos do Tailwind não são permitidos. Use a paleta Shemá (areia, azul, verde, telha) ou a camada semântica (fg-muted, fg-subtle, line).",
        },
        {
          selector: "Literal[value=/bg-white/]",
          message:
            "bg-white não é permitido. Superfícies elevadas usam bg-elevated.",
        },
        {
          selector: "TemplateElement[value.raw=/bg-white/]",
          message:
            "bg-white não é permitido. Superfícies elevadas usam bg-elevated.",
        },
      ],
    },
  },
]);
