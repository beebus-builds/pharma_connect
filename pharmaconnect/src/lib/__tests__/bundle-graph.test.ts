import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * SPECS 3B: the 3D scene and the Leaflet map must never be on a homepage
 * critical-path chunk.
 *
 * A runtime `lite` check is not enough — the module still ships in the initial
 * payload. Only a dynamic `import()` keeps it out. Build output cannot prove this
 * (minified chunks carry no module paths), so we walk the source graph instead.
 *
 * The invariant asserted below is the one that actually has teeth: walk the whole
 * graph from the homepage, recording whether each edge was static or dynamic, and
 * require that any module statically importing `three`/`leaflet` is reachable
 * *only* through dynamic edges. Walking the static graph alone would be vacuous —
 * dynamic edges are exactly what removes a module from it.
 */

const SRC = resolve(process.cwd(), "src");
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

/** Bare package specifiers that must never be statically imported anywhere below. */
const FORBIDDEN = ["three", "@react-three/fiber", "@react-three/drei", "leaflet", "react-leaflet"];

const STATIC_IMPORT = /(?:^|[\s;{}()])(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveFile(path: string): string | null {
  if (isFile(path)) return path;
  for (const ext of EXTENSIONS) if (isFile(path + ext)) return path + ext;
  for (const index of ["index.tsx", "index.ts", "index.jsx", "index.js"]) {
    const candidate = resolve(path, index);
    if (isFile(candidate)) return candidate;
  }
  return null;
}

type EdgeKind = "static" | "dynamic";

/** All modules reachable from `entry`, with the weakest edge kind that reaches each. */
function walk(entry: string): { files: Set<string>; dynamicOnly: Set<string> } {
  const files = new Set<string>();
  // A file is "dynamic-only" if every path to it crosses at least one dynamic edge.
  const dynamicOnly = new Set<string>();

  const visit = (file: string, viaDynamic: boolean) => {
    if (files.has(file)) {
      // A single static path is enough to put the module on the critical path,
      // so the flag is sticky in that direction: one static edge clears it.
      if (!viaDynamic) dynamicOnly.delete(file);
      return;
    }
    files.add(file);
    if (viaDynamic) dynamicOnly.add(file);

    const source = readFileSync(file, "utf8");
    const edges: { specifier: string; kind: EdgeKind }[] = [];
    // Blank out dynamic imports first so their specifiers are not read as static.
    const staticOnly = source.replace(DYNAMIC_IMPORT, '""');
    for (const m of staticOnly.matchAll(STATIC_IMPORT)) if (m[1]) edges.push({ specifier: m[1], kind: "static" });
    for (const m of source.matchAll(DYNAMIC_IMPORT)) if (m[1]) edges.push({ specifier: m[1], kind: "dynamic" });

    for (const { specifier, kind } of edges) {
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
      const base = specifier.startsWith("@/") ? resolve(SRC, specifier.slice(2)) : resolve(dirname(file), specifier);
      const next = resolveFile(base);
      if (next) visit(next, kind === "dynamic");
    }
  };

  const root = resolveFile(entry);
  if (root) visit(root, false);
  return { files, dynamicOnly };
}

/** Modules that statically import one of the forbidden packages. Paths stay absolute. */
function forbiddenImporters(files: Set<string>): { abs: string; file: string; specifier: string }[] {
  const offenders: { abs: string; file: string; specifier: string }[] = [];
  for (const abs of files) {
    const staticOnly = readFileSync(abs, "utf8").replace(DYNAMIC_IMPORT, '""');
    for (const m of staticOnly.matchAll(STATIC_IMPORT)) {
      const specifier = m[1] ?? "";
      if (FORBIDDEN.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))) {
        offenders.push({ abs, file: abs.replace(SRC, "src"), specifier });
      }
    }
  }
  return offenders;
}

const homepage = resolve(SRC, "app/page.tsx");
const { files, dynamicOnly } = walk(homepage);
const offenders = forbiddenImporters(files);
const onCriticalPath = offenders.filter((o) => !dynamicOnly.has(o.abs));

describe("homepage bundle graph (SPECS 3B)", () => {
  it("resolves a non-trivial graph from the homepage", () => {
    // Guards the rest of this file: a broken resolver makes every check vacuous.
    expect(files.size).toBeGreaterThan(5);
  });

  it("actually does reach the heavy deps somewhere, or the check is vacuous", () => {
    // If nothing imports three/leaflet at all the assertion below proves nothing.
    expect(offenders.length).toBeGreaterThan(0);
  });

  it("reaches three, leaflet and react-leaflet only through dynamic imports", () => {
    expect(
      onCriticalPath.map((o) => `${o.file} -> ${o.specifier}`),
      "these heavy deps are on the homepage critical path; use dynamic import() instead"
    ).toEqual([]);
  });

  it("knows the 3D scene and the leaflet map are the dynamic leaves", () => {
    const summary = offenders.map((o) => `${o.file} (${dynamicOnly.has(o.abs) ? "dynamic" : "STATIC"})`);
    expect(summary).toEqual(
      expect.arrayContaining([expect.stringContaining("Hero3DScene"), expect.stringContaining("MapView")])
    );
  });

  it("loads the 3D scene and the leaflet map through dynamic imports", () => {
    const hero3D = readFileSync(resolve(SRC, "components/ui/Hero3D.tsx"), "utf8");
    expect(hero3D).toMatch(/\bimport\s*\(\s*["']\.\/Hero3DScene["']\s*\)/);

    const mapClient = readFileSync(resolve(SRC, "components/MapViewClient.tsx"), "utf8");
    expect(mapClient).toMatch(/\bimport\s*\(\s*["']@\/components\/MapView["']\s*\)/);

    const page = readFileSync(homepage, "utf8");
    expect(page).toMatch(/dynamic\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']@\/components\/MapViewClient["']/);
    expect(page).toMatch(/dynamic\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']@\/components\/ui\/Hero3D["']/);
  });
});
