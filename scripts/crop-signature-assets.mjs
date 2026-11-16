import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/templates");
const page3 = path.join(dir, "sig-ref-page-3.png");
const page2 = path.join(dir, "sig-ref-page-2.png");

async function main() {
  // Crop below brochure description so hero image has no baked-in text
  await sharp(page2)
    .extract({ left: 36, top: 385, width: 1116, height: 500 })
    .jpeg({ quality: 92 })
    .toFile(path.join(dir, "signature-hero.jpg"));

  const elevs = [
    ["elev-front.png", 38, 98, 430, 228],
    ["elev-lshape.png", 478, 98, 430, 228],
    ["elev-island.png", 38, 336, 430, 228],
    ["elev-ushape.png", 478, 336, 430, 228],
  ];
  for (const [name, left, top, width, height] of elevs) {
    await sharp(page3).extract({ left, top, width, height }).png().toFile(path.join(dir, name));
  }

  // Hardware thumbs from measured page coords (inside HARDWARE FITTINGS column)
  const thumbs = [
    ["hw-tandem.png", 978, 159],
    ["hw-organizer.png", 978, 254],
    ["hw-thali.png", 978, 348],
    ["hw-led.png", 979, 426],
    ["hw-bottle.png", 981, 511],
    ["hw-socket.png", 981, 640],
  ];
  for (const [name, left, top] of thumbs) {
    await sharp(page3)
      .extract({ left, top, width: 70, height: 70 })
      .png()
      .toFile(path.join(dir, name));
  }

  console.log("signature assets cropped");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
