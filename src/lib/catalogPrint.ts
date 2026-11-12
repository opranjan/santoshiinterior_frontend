const PRINT_STYLES = `
  @page { size: A4 landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print, .empty-slot, input[type="file"], button { display: none !important; }
  .catalog-print-sheet {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    font-family: "Montserrat", "Segoe UI", Arial, sans-serif;
  }
  .catalog-print-sheet input,
  .catalog-print-sheet textarea {
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
  .catalog-page {
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
    position: relative;
  }
  .catalog-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  .catalog-cover {
    display: grid;
    grid-template-columns: 42% 58%;
    background: #000 !important;
    color: #fff;
  }
  .catalog-cover-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 18mm 14mm;
  }
  .catalog-cover-title {
    font-size: 42pt !important;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1;
    color: #fff !important;
    margin: 0;
  }
  .catalog-cover-subtitle {
    font-size: 18pt !important;
    font-weight: 600;
    letter-spacing: 0.28em;
    color: #c4a574 !important;
    margin: 4mm 0 0;
  }
  .catalog-cover-rule {
    width: 48px;
    height: 2px;
    margin-top: 8mm;
    background: linear-gradient(90deg, #c4a574, transparent) !important;
  }
  .catalog-cover-right {
    position: relative;
    overflow: hidden;
  }
  .catalog-cover-right img.cover-hero {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: right center;
  }
  .catalog-brand-badge {
    position: absolute;
    top: 10mm;
    right: 12mm;
    text-align: right;
    z-index: 2;
  }
  .catalog-brand-top {
    font-size: 14pt !important;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #fff !important;
  }
  .catalog-brand-bottom {
    font-size: 9pt !important;
    font-weight: 600;
    letter-spacing: 0.28em;
    color: #c4a574 !important;
  }
  .catalog-table-page {
    background: #fff !important;
    padding: 8mm 8mm 10mm;
    display: flex;
    flex-direction: column;
  }
  .catalog-table-page.variant-green { background: #00332b !important; }
  .catalog-table-head {
    display: flex;
    align-items: center;
    gap: 4mm;
    margin-bottom: 4mm;
  }
  .catalog-logo-mark {
    width: 12mm;
    height: 9mm;
    flex-shrink: 0;
    object-fit: contain;
    display: block;
  }
  .catalog-head-brand {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #fff !important;
  }
  .catalog-banner {
    margin: 2mm auto 2mm;
    background: linear-gradient(90deg, #b8924e, #e8d5b5, #b8924e) !important;
    color: #111 !important;
    font-size: 16pt !important;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-align: center;
    padding: 2.5mm 8mm;
    width: fit-content;
    min-width: 70%;
  }
  .catalog-tag {
    margin: 0 auto 4mm;
    background: #fff !important;
    color: #111 !important;
    border: 1.5px solid #00332b;
    font-size: 10pt !important;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-align: center;
    padding: 1.5mm 8mm;
    width: fit-content;
  }
  .catalog-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    flex: 1;
    background: #fff !important;
  }
  .catalog-table th,
  .catalog-table td {
    border: 1.2px solid #e2b84c;
    vertical-align: middle;
    padding: 2mm 2.5mm;
  }
  .variant-green .catalog-table th {
    background: #00332b !important;
    color: #f5e6c8 !important;
  }
  .variant-yellow .catalog-table th {
    background: #f0c419 !important;
    color: #111 !important;
  }
  .variant-blue .catalog-table th {
    background: #9ec9e8 !important;
    color: #111 !important;
  }
  .catalog-table th {
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
  }
  .catalog-table td {
    font-size: 7.5pt;
    color: #111;
    background: #fffaf0 !important;
  }
  .variant-blue .catalog-table td { background: #fff !important; }
  .col-sr { width: 10mm; text-align: center; font-weight: 800; }
  .col-rate { width: 28mm; text-align: center; font-weight: 700; }
  .col-model { width: 18mm; text-align: center; font-weight: 800; }
  .col-pics { width: 42%; }
  .pic-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5mm;
    align-items: center;
    justify-content: flex-start;
  }
  .pic-grid img {
    height: 18mm;
    width: auto;
    max-width: 28mm;
    object-fit: cover;
    border: 0.6px solid #e2b84c;
  }
  .pic-label {
    display: block;
    font-size: 5.5pt;
    text-align: center;
    margin-top: 0.5mm;
  }
  .catalog-closing {
    background: #f0f2f5 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16mm 24mm;
    color: #333;
  }
  .closing-headline {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22pt !important;
    font-weight: 500;
    color: #2f343a !important;
    margin: 0 0 6mm;
  }
  .closing-body {
    max-width: 170mm;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #6b7280 !important;
    margin: 0 0 10mm;
  }
  .closing-visit {
    width: 100%;
    background: #e5e7eb !important;
    padding: 5mm 8mm;
    margin-bottom: 8mm;
  }
  .closing-visit-title {
    font-size: 12pt !important;
    font-weight: 800;
    letter-spacing: 0.14em;
    margin: 0 0 1mm;
  }
  .closing-visit-body {
    font-size: 8.5pt;
    color: #4b5563 !important;
    margin: 0;
  }
  .closing-web-label {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    margin: 0 0 1mm;
  }
  .closing-web-url {
    font-size: 9pt;
    color: #374151 !important;
    margin: 0 0 6mm;
  }
  .closing-follow {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #9a7748 !important;
    margin: 0 0 1mm;
  }
  .closing-handle {
    font-size: 9pt;
    margin: 0 0 8mm;
  }
  .closing-experience {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    margin: 0 0 6mm;
  }
  .closing-tagline {
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.35em;
    color: #4b5563 !important;
  }
`;

function replaceFields(clone: HTMLElement) {
  clone.querySelectorAll("input, textarea").forEach((node) => {
    const el = node as HTMLInputElement | HTMLTextAreaElement;
    const span = document.createElement(el.tagName === "TEXTAREA" ? "div" : "div");
    span.className = el.getAttribute("data-print-class") || "";
    span.textContent = el.value.trim();
    span.style.whiteSpace = "pre-wrap";
    el.replaceWith(span);
  });
}

export async function printCatalogPdf(title = "KITCHEN COLLECTION material sheet") {
  const sheet = document.querySelector(".catalog-print-sheet");
  if (!sheet) {
    window.print();
    return;
  }
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".no-print").forEach((el) => el.remove());
  clone.querySelectorAll(".empty-slot").forEach((el) => el.remove());
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
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet" />
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
    setTimeout(cleanup, 60_000);
  };

  await waitForImages;
  setTimeout(runPrint, 250);
}
