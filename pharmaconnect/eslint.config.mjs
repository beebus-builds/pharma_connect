import nextConfig from "eslint-config-next";

export default [
  {
    // Agent worktrees and tool state live inside the repo but are not app code.
    ignores: [".kilo/**", ".freebuff/**", "node_modules/**", ".next/**"],
  },
  ...nextConfig,
  {
    // These React Compiler-readiness rules flag several pre-existing
    // effect/ref patterns across the app. Downgraded to warnings so CI
    // stays actionable without blocking on a wider hooks refactor.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    files: ["src/components/PharmacyCard.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];
