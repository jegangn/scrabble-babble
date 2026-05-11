// Generate PWA icons from an inline SVG monogram.
// Run once: `bun run gen:icons`. Output: public/icons/{icon-192,icon-512,apple-touch-icon}.png
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7c4a2a"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="280" font-weight="700" fill="#f5ede2" dominant-baseline="middle">SB</text>
</svg>
`;

const outDir = join(process.cwd(), "public", "icons");
await mkdir(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  const buf = Buffer.from(SVG(size));
  await sharp(buf).resize(size, size).png().toFile(join(outDir, name));
  console.log(`Wrote ${name} (${size}×${size})`);
}
