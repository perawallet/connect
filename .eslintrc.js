const path = require("path");

module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    browser: true,
    jest: true,
    es6: true
  },
  extends: [
    "@hipo/eslint-config-base",
    "@hipo/eslint-config-typescript",
    "plugin:import/typescript",
    "prettier"
  ],
  parserOptions: {
    project: path.resolve(__dirname, "./tsconfig.json"),
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    },
    createDefaultProgram: true
  },
  globals: {
    __dirname: true,
    module: true
  },
  overrides: [
    {
      files: ["*.config.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    },
    {
      files: ["*.d.ts"],
      rules: {
        "newline-after-var": "off"
      }
    }
  ],
  rules: {
    // 👇🏻 `@typescript-eslint` overrides
    "@typescript-eslint/ban-ts-comment": 0,

    "func-names": 0,
    "id-length": 0
  }
};
