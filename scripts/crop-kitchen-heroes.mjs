import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/templates");

const crops = [
  { page: 2, out: "kitchen-smart-storage.jpg" },
  { page: 4, out: "kitchen-sage-elegance.jpg" },
  { page: 6, out: "kitchen-classic-taupe.jpg" },
  { page: 8, out: "kitchen-urban-grey.jpg" },
];

async function contentBottom(file) {
  const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  for (let y = info.height - 1; y >= 0; y -= 1) {
    let nonWhite = 0;
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      if (data[i] < 248 || data[i + 1] < 248 || data[i + 2] < 248) nonWhite += 1;
    }
    if (nonWhite > info.width * 0.02) return y;
  }
  return info.height - 1;
}

for (const c of crops) {
  const src = path.join(dir, `sig-page-${c.page}.png`);
  const dest = path.join(dir, c.out);
  const tmp = path.join(dir, `_tmp-${c.out}`);
  await sharp(src).extract({ left: 36, top: 370, width: 1116, height: 520 }).toFile(tmp);
  const bottom = await contentBottom(tmp);
  await sharp(tmp)
    .extract({ left: 0, top: 0, width: 1116, height: bottom + 1 })
    .jpeg({ quality: 92 })
    .toFile(dest);
  await sharp.cache(false);
  const fs = await import("fs");
  fs.unlinkSync(tmp);
  console.log("wrote", c.out, "h", bottom + 1);
}
