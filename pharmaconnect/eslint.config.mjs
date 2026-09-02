import nextConfig from "eslint-config-next";

export default [
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
];
