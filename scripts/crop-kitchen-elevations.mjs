import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/templates");

/** Specs pages in signature-series.pdf → kitchen slug */
const PAGES = [
  { page: 3, slug: "smart" },
  { page: 5, slug: "sage" },
  { page: 7, slug: "taupe" },
  { page: 9, slug: "urban" },
];

/** 2×2 elevation grid on each specs page (1188×918 renders) */
const ELEVS = [
  ["front", 38, 98, 430, 228],
  ["lshape", 478, 98, 430, 228],
  ["island", 38, 336, 430, 228],
  ["ushape", 478, 336, 430, 228],
];

async function main() {
  for (const { page, slug } of PAGES) {
    const src = path.join(dir, `sig-page-${page}.png`);
    for (const [kind, left, top, width, height] of ELEVS) {
      const out = path.join(dir, `elev-${slug}-${kind}.png`);
      await sharp(src).extract({ left, top, width, height }).png().toFile(out);
      console.log("wrote", path.basename(out));
    }
  }
  // Legacy shared names → Smart Storage set
  for (const [kind] of ELEVS) {
    await sharp(path.join(dir, `elev-smart-${kind}.png`))
      .png()
      .toFile(path.join(dir, `elev-${kind}.png`));
  }
  console.log("kitchen elevations cropped");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
