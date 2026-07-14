import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/util/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts", "src/**/*Types.ts"]
    }
  }
});
