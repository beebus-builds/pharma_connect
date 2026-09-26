type SentryModule = typeof import("@sentry/nextjs");
type RouterTransitionArgs = Parameters<SentryModule["captureRouterTransitionStart"]>;

let sentry: SentryModule | null = null;
let started = false;

async function startClientMonitoring() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (started || !dsn || document.documentElement.dataset.liteMode !== "false") return;
  started = true;
  const sentryModule = await import("@sentry/nextjs");
  sentry = sentryModule;
  sentryModule.init({ dsn, tracesSampleRate: 0.1, enabled: true });
}

function startWhenModeIsReady() {
  if (document.documentElement.dataset.liteMode === undefined) {
    window.addEventListener("pharmaconnect:lite-mode-ready", () => void startClientMonitoring(), { once: true });
    return;
  }
  void startClientMonitoring();
}

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  startWhenModeIsReady();
}

export function onRouterTransitionStart(...args: RouterTransitionArgs) {
  sentry?.captureRouterTransitionStart(...args);
}
