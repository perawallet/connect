const path = require("path");

module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["react", "react-hooks", "@typescript-eslint"],
  env: {
    browser: true,
    jest: true,
    es6: true
  },
  extends: [
    "@hipo/eslint-config-base",
    "@hipo/eslint-config-react",
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
  settings: {
    react: {
      // Tells eslint-plugin-react to automatically detect the version of React to use
      version: "detect"
    }
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
    // 👇🏻 Rules for hooks
    "react-hooks/rules-of-hooks": 2,
    "react-hooks/exhaustive-deps": 1,

    // 👇🏻 `@typescript-eslint` overrides
    "@typescript-eslint/ban-ts-comment": 0,

    "func-names": 0,
    "id-length": 0,

    "react/destructuring-assignment": 0,
    "react/jsx-handler-names": [
      "error",
      {
        eventHandlerPrefix: false,
        eventHandlerPropPrefix: "on"
      }
    ],
    "react/jsx-filename-extension": [
      1,
      {
        extensions: [".jsx", ".tsx"]
      }
    ],
    "react/sort-comp": [
      2,
      {
        groups: {
          rendering: ["render", "/^render.+$/"]
        }
      }
    ]
  }
};
