import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = path.resolve(
  "../public/templates/kitchen-collection-material-sheet.pdf"
);
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data, disableWorker: true }).promise;
console.log("PAGES", doc.numPages);

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const lines = [];
  let lastY = null;
  let buf = "";
  for (const item of content.items) {
    const str = item.str || "";
    const y = item.transform?.[5];
    if (lastY !== null && Math.abs(y - lastY) > 3) {
      lines.push(buf.trim());
      buf = "";
    }
    buf += (buf && !buf.endsWith(" ") && str ? " " : "") + str;
    lastY = y;
  }
  if (buf.trim()) lines.push(buf.trim());
  console.log(`\n===== PAGE ${i} =====`);
  console.log(lines.filter(Boolean).join("\n"));
  const viewport = page.getViewport({ scale: 1 });
  console.log(`SIZE ${viewport.width}x${viewport.height}`);
}
