import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // інтеграційні тести ділять одну тестову базу — без паралелі між файлами
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
