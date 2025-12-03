import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/react-in-jsx-scope": "off"
    }
  },
  {
    ignores: ["node_modules/", "dist/", ".expo/", "babel.config.js", "node_modules/**", "dist/**", ".expo/**", "yarn.lock", "package-lock.json", "pnpm-lock.yaml", ".git/**", ".github/**", ".vscode/**", "coverage/**", "ios/**", "android/**", "Pods/**", "node_modules/**/*.*", "web-build/**", "*.test.*", "*.spec.*", "src/**/*.test.ts", "src/**/*.test.tsx"]
  }
]);
