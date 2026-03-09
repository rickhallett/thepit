import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        // Browser/Web globals
        Response: "readonly",
        Request: "readonly",
        ReadableStream: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Headers: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        setTimeout: "readonly",
        FormData: "readonly",
        AbortController: "readonly",
        globalThis: "readonly",
        // React
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
      // TypeScript allows same name for value and type (const + type pattern)
      "no-redeclare": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "sites/**",
      "**/*.config.*",
    ],
  },
];
