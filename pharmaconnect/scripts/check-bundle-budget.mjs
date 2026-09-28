/**
 * Lite-mode transfer budget (SPECS 3B).
 *
 * The spec's acceptance criterion is "homepage < 200 KB transferred in lite
 * mode". "Transferred" means what actually crosses the wire, so the budget is
 * measured against gzip-compressed bytes — that is what Vercel and every CDN in
 * front of this app serve via `content-encoding: gzip`. The raw figure is
 * printed alongside for context.
 *
 * Scope: the JavaScript the prerendered homepage document references. HTML,
 * fonts and images are not counted. A cold browser cache with the service worker
 * already installed will transfer less; a first visit is the worst case.
 *
 * This measurement is only meaningful because the heavy visual deps are reached
 * exclusively through dynamic imports. That invariant is enforced at the source
 * level by `src/lib/__tests__/bundle-graph.test.ts`, which walks the static
 * import graph of the homepage — build output alone cannot prove it, since
 * minified chunks carry no module paths.
 *
 * Run after a build:  npm run build && npm run check:bundle
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const nextDir = resolve(root, ".next");

/**
 * Current measured homepage JS: ~228 KB gzipped (~760 KB raw).
 *
 * SPECS 3B set the target at 200 KB and it is NOT met. Almost all of what is
 * left is the React + Next.js client runtime, so closing the gap is not a
 * "lazy-load one more component" job — it needs the static shell (nav, hero
 * copy, footer) moved to server components so none of it ships as client JS.
 * That is tracked as open work in SPECS.md.
 *
 * The budget below is set just above today's figure so this script acts as a
 * regression guard, not a rubber stamp. Raise it deliberately and say why.
 */
const BUDGET_BYTES = 240 * 1024;
/** The SPECS 3B acceptance target, reported so the gap stays visible. */
const SPEC_TARGET_BYTES = 200 * 1024;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`\n✖ bundle budget: ${message}\n`);
  process.exitCode = 1;
}

const homepageHtml = resolve(nextDir, "server/app/index.html");

if (!(await exists(homepageHtml))) {
  fail("no prerendered homepage at .next/server/app/index.html — run `npm run build` first");
} else {
  const html = await readFile(homepageHtml, "utf8");

  // Every <script src> the document loads, deduped, in document order.
  const sources = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];

  let rawTotal = 0;
  let gzipTotal = 0;
  const perChunk = [];
  let missing = 0;

  for (const src of sources) {
    // URLs are served from /_next/... but live on disk at .next/...
    const abs = resolve(nextDir, src.replace(/^\/_next\//, "").replace(/^\//, ""));
    if (!(await exists(abs))) {
      missing += 1;
      continue;
    }
    const bytes = await readFile(abs);
    const gzip = gzipSync(bytes, { level: 9 }).length;
    rawTotal += bytes.length;
    gzipTotal += gzip;
    perChunk.push([src, bytes.length, gzip]);
  }
  perChunk.sort((a, b) => b[2] - a[2]);

  const kb = (n) => (n / 1024).toFixed(1).padStart(8);
  console.log(`\nHomepage critical-path JavaScript (${perChunk.length} scripts):`);
  console.log(`        gzip      raw  file`);
  for (const [src, raw, gzip] of perChunk) {
    console.log(`  ${kb(gzip)} KB ${kb(raw)} KB  ${src}`);
  }
  console.log(`  ${"-".repeat(52)}`);
  console.log(`  ${kb(gzipTotal)} KB ${kb(rawTotal)} KB  total (gzip budget ${BUDGET_BYTES / 1024} KB)\n`);

  if (missing > 0) {
    fail(`could not resolve ${missing} script(s) on disk — the build layout changed, update this script`);
  } else if (gzipTotal > BUDGET_BYTES) {
    fail(
      `homepage JavaScript is ${(gzipTotal / 1024).toFixed(1)} KB gzipped, over the ` +
        `${BUDGET_BYTES / 1024} KB budget — make something dynamic, or raise the budget deliberately`
    );
  } else {
    console.log(
      `✔ within regression budget: ${(gzipTotal / 1024).toFixed(1)} KB gzipped of ` +
        `${BUDGET_BYTES / 1024} KB (${Math.round((gzipTotal / BUDGET_BYTES) * 100)}% used)`
    );
  }

  if (gzipTotal > SPEC_TARGET_BYTES) {
    console.log(
      `⚠ SPECS 3B target is ${SPEC_TARGET_BYTES / 1024} KB — over by ` +
        `${((gzipTotal - SPEC_TARGET_BYTES) / 1024).toFixed(1)} KB. Not fixed; needs a server-components pass.`
    );
  }

  const chunksDir = resolve(nextDir, "static/chunks");
  if (await exists(chunksDir)) {
    const lazy = (await readdir(chunksDir)).length - perChunk.length;
    console.log(`✔ ${lazy} further chunk(s) are lazy and never requested by the homepage`);
  }
  console.log("note: excludes HTML, fonts and images — verify in DevTools before quoting a figure.\n");
}
