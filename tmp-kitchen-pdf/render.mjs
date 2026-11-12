import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = path.resolve(
  "../public/templates/kitchen-collection-material-sheet.pdf"
);
const outDir = path.resolve("./pages");
fs.mkdirSync(outDir, { recursive: true });

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data, disableWorker: true }).promise;
const scale = 1.5;

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;
  const out = path.join(outDir, `page-${i}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("wrote", out, Math.ceil(viewport.width), "x", Math.ceil(viewport.height));
}
