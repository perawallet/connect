import {version as PeraConnectVersion} from "./package.json";

import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import image from "@rollup/plugin-image";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import sizes from "rollup-plugin-sizes";

export default [
  {
    input: {
      index: "src/index.ts"
    },
    output: {
      dir: "dist",
      format: "cjs",
      name: "PeraConnect",
      globals: {
        "@walletconnect/client": "WalletConnect",
        algosdk: "algosdk",
        bowser: "bowser",
        "qr-code-styling": "QRCodeStyling",
        "@evanhahn/lottie-web-light": "lottie"
      }
    },
    external: [
      "@walletconnect/client",
      "@walletconnect/types",
      "algosdk",
      "@evanhahn/lottie-web-light",
      "bowser",
      "qr-code-styling",
      "bufferutil",
      "utf-8-validate"
    ],
    plugins: [
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
        PERA_CONNECT_VERSION: `v${PeraConnectVersion}`,
        preventAssignment: true
      })
    ]
  }
];
