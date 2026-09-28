import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    // Pure-logic suites (src/lib, realtime) run in node. Component suites opt into
    // jsdom with a `// @vitest-environment jsdom` docblock so the default stays fast.
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "realtime/**"],
    setupFiles: [resolve(__dirname, "src/test/setup.ts")],
    clearMocks: true,
  },
});
