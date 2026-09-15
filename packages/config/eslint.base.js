// Config base de ESLint compartida por apps/*. Cada app puede extenderla y sumar reglas propias.
export default {
  env: { es2022: true, node: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
