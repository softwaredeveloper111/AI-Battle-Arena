import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./test/helpers/testEnv.ts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/setup.ts"],
    env: TEST_ENV,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/controllers/auth.controller.ts",
        "src/routes/auth.route.ts",
        "src/middlewares/**/*.ts",
        "src/validations/**/*.ts",
        "src/models/**/*.ts",
        "src/services/google-auth.service.ts",
        "src/config/passport.ts",
        "src/utils/**/*.ts",
        "src/app.ts",
      ],
    },
  },
});
