import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each test file connects to a separate MongoDB database.
    // Run files serially to avoid Mongoose connection pool conflicts.
    fileParallelism: false,
    testTimeout: 30000,
  },
});
