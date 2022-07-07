import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import image from "@rollup/plugin-image";
import json from "@rollup/plugin-json";

export default [
  {
    input: {
      index: "src/index.ts"
    },
    output: {
      dir: "dist",
      format: "cjs"
    },
    external: [
      "react",
      "react-dom",
      "@walletconnect/client",
      "@hipo/react-ui-toolkit",
      "react-qrcode-logo",
      "@json-rpc-tools/utils/dist/cjs/format",
      "algosdk",
      "lottie-react"
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
  }
];
