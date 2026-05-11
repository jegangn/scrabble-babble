import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**/*.ts"],
      exclude: ["src/engine/**/__tests__/**", "src/engine/**/__fixtures__/**"],
      reporter: ["text", "html"],
      thresholds: {
        lines: 90,
        statements: 90,
      },
    },
  },
});
