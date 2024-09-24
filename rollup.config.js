import { version as PeraConnectVersion } from "./package.json";

import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import image from "@rollup/plugin-image";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import sizes from "rollup-plugin-sizes";
import bundleESM from "rollup-plugin-bundle-esm";

// External dependencies to be excluded from the bundle
const externalDependencies = [
  "@json-rpc-tools/utils",
  "algosdk",
  "@evanhahn/lottie-web-light",
  "bowser",
  "qr-code-styling",
  "bufferutil",
  "utf-8-validate"
];

// Common plugins used in both builds
const commonPlugins = [
  image(),
  terser(),
  postcss(),
  typescript({
    rollupCommonJSResolveHack: true,
    exclude: "**/__tests__/**",
    clean: true
  }),
  json(),
  sizes(),
  replace({
    PERA_CONNECT_VERSION: `v${PeraConnectVersion} - BETA`,
    preventAssignment: true
  })
];

// ESM Build Configuration
const esmBuild = {
  input: {
    index: "src/index.ts"
  },
  output: {
    dir: "dist/esm",
    format: "esm",
    name: "PeraConnect",
    globals: {
      algosdk: "algosdk",
      bowser: "bowser",
      "@json-rpc-tools/utils": "format",
      "qr-code-styling": "QRCodeStyling",
      "@evanhahn/lottie-web-light": "lottie"
    }
  },
  external: externalDependencies,
  plugins: [
    ...commonPlugins,
    bundleESM()
  ]
};

// CJS Build Configuration
const cjsBuild = {
  input: {
    index: "src/index.ts"
  },
  output: {
    dir: "dist/cjs",
    format: "cjs",
    name: "PeraConnect",
    globals: {
      algosdk: "algosdk",
      bowser: "bowser",
      "@json-rpc-tools/utils": "format",
      "qr-code-styling": "QRCodeStyling",
      "@evanhahn/lottie-web-light": "lottie"
    }
  },
  external: externalDependencies,
  plugins: commonPlugins
};

// Export both configurations
export default [esmBuild, cjsBuild];
