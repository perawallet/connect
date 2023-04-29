import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import image from "@rollup/plugin-image";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
  {
    input: {
      index: "src/index.ts"
    },
    output: {
      dir: "dist/cjs",
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
      "utf-8-validate",
      "buffer"
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
      json()
    ]
  }, {
    input: {
      index: "src/index.ts"
    },
    output: {
      dir: "dist/umd",
      format: "umd",
      name: "PeraConnect",
      globals: {
        "@walletconnect/client": "WalletConnect",
        algosdk: "algosdk",
        bowser: "bowser",
        "qr-code-styling": "QRCodeStyling",
        "@evanhahn/lottie-web-light": "lottie"
      },
      inlineDynamicImports: true
    },
    external: [
      "@walletconnect/client",
      "@walletconnect/types",
      "algosdk",
      "@evanhahn/lottie-web-light",
      "bowser",
      "qr-code-styling"
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
      resolve({
        preferBuiltins: false
      }),
      commonjs()
    ]
  }
];
