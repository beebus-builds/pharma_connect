/**
 * Vitest setup shared by node and jsdom suites. Kept free of DOM assumptions so
 * it is safe to load in the default node environment.
 */
import { vi } from "vitest";

// Deterministic defaults for anything that reads config at module scope.
process.env.NEXTAUTH_SECRET ??= "test-secret";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    // `after` only exists inside a real request scope; make it a no-op in tests.
    after: (task: () => unknown) => {
      void Promise.resolve().then(task).catch(() => {});
    },
  };
});
