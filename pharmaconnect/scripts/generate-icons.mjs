import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/icons");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" rx="14" fill="#2f9480"/>
  <g transform="rotate(-28 32 32)">
    <rect x="22" y="10" width="20" height="44" rx="10" fill="#ffffff"/>
    <rect x="22" y="10" width="20" height="22" rx="10" fill="#7dccb4"/>
    <rect x="22" y="30" width="20" height="4" fill="#ffffff" opacity="0.9"/>
  </g>
</svg>`;

/** Maskable icons need the logo inside the safe zone (80% of the canvas). */
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" fill="#2f9480"/>
  <g transform="translate(32 32) scale(0.72) rotate(-28) translate(-32 -32)">
    <rect x="22" y="10" width="20" height="44" rx="10" fill="#ffffff"/>
    <rect x="22" y="10" width="20" height="22" rx="10" fill="#7dccb4"/>
    <rect x="22" y="30" width="20" height="4" fill="#ffffff" opacity="0.9"/>
  </g>
</svg>`;

const targets = [
  { file: "icon-192.png", source: svg, size: 192 },
  { file: "icon-512.png", source: svg, size: 512 },
  { file: "maskable-512.png", source: maskableSvg, size: 512 },
  { file: "apple-touch-icon.png", source: maskableSvg, size: 180 },
  { file: "favicon-32.png", source: svg, size: 32 },
];

await mkdir(outDir, { recursive: true });

for (const { file, source, size } of targets) {
  const buffer = await sharp(Buffer.from(source)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(resolve(outDir, file), buffer);
  console.log(`wrote public/icons/${file} (${size}x${size}, ${buffer.length} bytes)`);
}
