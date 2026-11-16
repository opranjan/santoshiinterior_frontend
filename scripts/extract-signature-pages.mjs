import { pdf } from "pdf-to-img";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/templates");
const pdfPath = path.join(outDir, "signature-series.pdf");

const doc = await pdf(pdfPath, { scale: 1.5 });
let i = 0;
for await (const page of doc) {
  i += 1;
  const file = path.join(outDir, `sig-page-${i}.png`);
  fs.writeFileSync(file, page);
  const meta = await sharp(page).metadata();
  console.log("page", i, meta.width + "x" + meta.height);
}
console.log("total", i);
