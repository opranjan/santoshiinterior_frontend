const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm 14mm; }
  @page :first { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #1c1610;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    min-height: 0 !important;
    height: auto !important;
  }
  .no-print, .empty-slot, input[type="file"] { display: none !important; }
  .elevation-print-sheet {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    font-family: Outfit, Georgia, "Times New Roman", serif;
    min-height: 0 !important;
  }
  .elevation-print-sheet input,
  .elevation-print-sheet textarea {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    width: 100%;
    font: inherit;
    color: inherit;
    resize: none;
    padding: 0 !important;
  }
  .doc-section {
    border: none !important;
    border-radius: 0 !important;
    padding: 0 0 8mm !important;
    margin: 0 !important;
    break-inside: auto;
    page-break-inside: auto;
  }
  .doc-section + .doc-section { padding-top: 2mm !important; }
  .elevation-cover {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    display: flex;
    flex-direction: column;
    border: none !important;
    border-radius: 0 !important;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
  }
  .elevation-cover-top {
    height: 54%;
    background: #000 !important;
    color: #fff !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18mm 16mm 12mm;
    text-align: center;
  }
  .elevation-cover-bottom {
    height: 46%;
    background: #c8c8c8 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 14mm 16mm;
    position: relative;
    text-align: center;
  }
  .cover-logo-wrap {
    width: 210px;
    height: 108px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14mm;
  }
  .cover-logo {
    height: 160px !important;
    width: auto !important;
    max-width: none !important;
    object-fit: cover;
    display: block;
    margin: 0;
  }
  .cover-title {
    font-size: 22pt !important;
    letter-spacing: 0.32em;
    font-weight: 400;
    color: #fff !important;
    margin: 0;
  }
  .cover-rule {
    width: 42px;
    height: 2px;
    background: #c4a574 !important;
    margin: 8mm auto 10mm;
  }
  .cover-meta {
    width: 100%;
    max-width: 170mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8mm;
    color: #fff !important;
  }
  .cover-meta-label {
    display: block;
    font-size: 7.5pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    opacity: 0.62;
    margin-bottom: 2mm;
  }
  .cover-meta-value {
    font-size: 9.5pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #fff !important;
    word-break: break-word;
  }
  .working-kicker {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: #111 !important;
    margin: 0 0 6mm;
  }
  .working-title {
    font-size: 20pt;
    color: #111 !important;
    letter-spacing: 0.04em;
  }
  .section-heading {
    font-size: 13pt;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 4mm;
    color: #1c1610;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
  }
  .photo-cell {
    background: #f6f1ea;
    border: 0.3pt solid #e4d8c8;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-cell img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    display: block;
  }
  .elevation-print-sheet table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .elevation-print-sheet th,
  .elevation-print-sheet td {
    border: 0.4pt solid #d7cbb8;
    padding: 2.4mm 2.2mm;
    font-size: 8.5pt;
    vertical-align: middle;
    text-align: left;
  }
  .elevation-print-sheet th {
    background: #1c1610 !important;
    color: #f4eadb !important;
    font-size: 7.5pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .elevation-print-sheet tr { break-inside: avoid; page-break-inside: avoid; }
  .col-sr { width: 10mm; text-align: center; }
  .col-size { width: 18mm; }
  .col-thick { width: 20mm; }
  .col-img { width: 22mm; }
  .material-row-image {
    width: 18mm !important;
    height: 14mm !important;
    object-fit: contain !important;
    display: block;
    margin: 0 auto;
    background: #fff;
  }
  .term-block { break-inside: avoid; page-break-inside: avoid; margin: 0 0 3.5mm; }
  .term-title { font-size: 10pt; font-weight: 700; margin: 0 0 1mm; }
  .term-body { font-size: 9pt; line-height: 1.45; color: #2a241c; white-space: pre-wrap; }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12mm;
    margin-top: 8mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sign-box img {
    width: 100%;
    height: 22mm;
    object-fit: contain;
    border-bottom: 0.5pt solid #1c1610;
    background: transparent !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
  }
  .sign-label {
    margin-top: 2mm;
    font-size: 7.5pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b5e4e;
  }
`;

function replaceFields(clone: HTMLElement) {
  clone.querySelectorAll("input, textarea").forEach((node) => {
    const el = node as HTMLInputElement | HTMLTextAreaElement;
    const span = document.createElement("div");
    span.className = el.getAttribute("data-print-class") || "";
    span.textContent = el.value.trim();
    span.style.whiteSpace = "pre-wrap";
    el.replaceWith(span);
  });
}

export async function printElevationSheet(title = "signedpdf2") {
  const sheet = document.querySelector(".elevation-print-sheet");
  if (!sheet) {
    window.print();
    return;
  }
  const clone = sheet.cloneNode(true) as HTMLElement;
  const sourceCanvases = sheet.querySelectorAll("canvas");
  const clonedCanvases = clone.querySelectorAll("canvas");
  sourceCanvases.forEach((canvas, index) => {
    const target = clonedCanvases[index];
    if (!target) return;
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    img.alt = "signature";
    target.replaceWith(img);
  });
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.querySelectorAll(".empty-slot").forEach((el) => el.remove());
  const photos = clone.querySelector(".elevation-photos");
  if (photos && !photos.querySelector("img")) photos.remove();
  replaceFields(clone);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    window.print();
    return;
  }
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/[<>&"]/g, "")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${PRINT_STYLES}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => iframe.remove();
  const waitForImages = Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const runPrint = () => {
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
  };
  void waitForImages.then(() => window.setTimeout(runPrint, 120));
}
