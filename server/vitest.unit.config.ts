import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./test/helpers/testEnv.ts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/ai/**/*.test.ts"],
    env: TEST_ENV,
    testTimeout: 10_000,
  },
});
