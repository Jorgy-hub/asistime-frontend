import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  { ignores: ["**/.next/**", "node_modules/**", "dist/**"] },
  js.configs.recommended,
  ...nextPlugin.configs["core-web-vitals"],
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: "./tsconfig.json", sourceType: "module" },
      globals: globals.browser,
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      // project-wide disables
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { globals: globals.browser },
    rules: { "no-unused-vars": "off" },
  },
];