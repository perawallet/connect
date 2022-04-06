import typescript from "rollup-plugin-typescript2";
import {terser} from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import reactSvg from "rollup-plugin-react-svg";

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
      "react-qr-code",
      "@json-rpc-tools/utils/dist/cjs/format",
      "algosdk"
    ],
    plugins: [
      reactSvg(),
      terser(),
      postcss(),
      typescript({
        rollupCommonJSResolveHack: true,
        exclude: "**/__tests__/**",
        clean: true
      })
    ]
  }
];
