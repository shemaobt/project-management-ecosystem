import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export const BRAND_INK = "text-(verde|branco|preto)(?![-a-z])";

export const NOT_SHIPPED_STYLING = ["**/__tests__/**"];

const BRAND_INK_MESSAGE =
  "Tinta sai da camada semântica, não do token de marca: text-fg, text-fg-strong, text-on-brand, text-on-dark, text-on-light. O modo escuro (§7.4) reatribui só os semânticos — um token de marca não segue a paleta quando ela chegar.";

const noRawColour = [
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
    message: "bg-white não é permitido. Superfícies elevadas usam bg-elevated.",
  },
  {
    selector: "TemplateElement[value.raw=/bg-white/]",
    message: "bg-white não é permitido. Superfícies elevadas usam bg-elevated.",
  },
  {
    selector: `Literal[value=/${BRAND_INK}/]`,
    message: BRAND_INK_MESSAGE,
  },
  {
    selector: `TemplateElement[value.raw=/${BRAND_INK}/]`,
    message: BRAND_INK_MESSAGE,
  },
];

const noRawValue = [
  {
    selector: "Literal[value=/-\\x5b[0-9.]+(px|rem|em|%|ms|s)\\x5d/]",
    message:
      "Constante de estilo não carrega valor bruto. Se falta um tamanho, o conserto é um token em src/index.css (FE-02), não um literal aqui.",
  },
  {
    selector: "TemplateElement[value.raw=/-\\x5b[0-9.]+(px|rem|em|%|ms|s)\\x5d/]",
    message:
      "Constante de estilo não carrega valor bruto. Se falta um tamanho, o conserto é um token em src/index.css (FE-02), não um literal aqui.",
  },
];
const USER_FACING_ATTRS = new Set([
  "title",
  "placeholder",
  "alt",
  "aria-label",
  "aria-description",
  "label",
  "message",
]);

const USER_FACING_ATTR_SUFFIXES = [
  "Label",
  "Message",
  "Title",
  "Text",
  "Description",
  "Placeholder",
];

const isUserFacingAttrName = (name) =>
  USER_FACING_ATTRS.has(name) ||
  USER_FACING_ATTR_SUFFIXES.some((suffix) => name.endsWith(suffix));

export const INTERNAL_SHOWCASE_UNTRANSLATED_BY_DESIGN = [
  "src/components/pages/design-system/ControlsSection.tsx",
  "src/components/pages/design-system/DesignSystemPage.tsx",
  "src/components/pages/design-system/StatusSection.tsx",
  "src/components/pages/design-system/SurfacesSection.tsx",
];

export const DEV_ONLY_NEVER_REACHES_A_USER = [
  "src/components/layout/RoleSwitcher.tsx",
];

const noHardcodedCopy = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      hardcoded:
        "Texto de UI não sai hardcoded: use uma chave dos catálogos (src/i18n/locales) via t(). Dado de campo (nome de língua, nota, pedido) renderiza direto, sem passar por tradução.",
    },
  },
  create(context) {
    const hasCopy = (value) =>
      typeof value === "string" && /\p{Ll}/u.test(value);
    const staticStrings = (expression) => {
      if (expression.type === "Literal") return [expression.value];
      if (
        expression.type === "TemplateLiteral" &&
        expression.expressions.length === 0
      ) {
        return [expression.quasis.map((quasi) => quasi.value.cooked).join("")];
      }
      if (expression.type === "ConditionalExpression") {
        return [
          ...staticStrings(expression.consequent),
          ...staticStrings(expression.alternate),
        ];
      }
      if (expression.type === "LogicalExpression") {
        return staticStrings(expression.right);
      }
      return [];
    };
    const isUserFacingAttr = (node) =>
      node.type === "JSXAttribute" &&
      node.name.type === "JSXIdentifier" &&
      isUserFacingAttrName(node.name.name);
    return {
      JSXText(node) {
        if (hasCopy(node.value)) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
      JSXAttribute(node) {
        if (
          isUserFacingAttr(node) &&
          node.value?.type === "Literal" &&
          hasCopy(node.value.value)
        ) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
      JSXExpressionContainer(node) {
        const parent = node.parent;
        const rendersToUser =
          parent.type === "JSXElement" ||
          parent.type === "JSXFragment" ||
          isUserFacingAttr(parent);
        if (rendersToUser && staticStrings(node.expression).some(hasCopy)) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
    };
  },
};

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
    files: ["src/components/**/*.tsx", "src/contexts/**/*.tsx"],
    ignores: [
      ...INTERNAL_SHOWCASE_UNTRANSLATED_BY_DESIGN,
      ...DEV_ONLY_NEVER_REACHES_A_USER,
    ],
    plugins: {
      shema: { rules: { "no-hardcoded-copy": noHardcodedCopy } },
    },
    rules: {
      "shema/no-hardcoded-copy": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: NOT_SHIPPED_STYLING,
    rules: {
      "no-restricted-syntax": ["error", ...noRawColour],
    },
  },
  {
    files: ["src/styles/**/*.ts"],
    ignores: NOT_SHIPPED_STYLING,
    rules: {
      "no-restricted-syntax": ["error", ...noRawColour, ...noRawValue],
    },
  },
]);
