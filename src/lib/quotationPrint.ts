const PRINT_STYLES = `
  @page { margin: 8mm; size: A4 portrait; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    min-height: 0 !important;
    height: auto !important;
  }
  .no-print { display: none !important; }
  .quotation-print-sheet {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111;
    font-family: Outfit, system-ui, sans-serif;
    min-height: 0 !important;
    box-shadow: none !important;
  }
  .quotation-print-sheet img {
    max-width: 100%;
    display: block;
  }
  .flex { display: flex; }
  .flex-wrap { flex-wrap: wrap; }
  .grid { display: grid; }
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .gap-3 { gap: 12px; }
  .w-full { width: 100%; }
  .mb-4 { margin-bottom: 16px; }
  .relative { position: relative; }
  .z-10 { z-index: 10; }
  .bg-white { background: #fff; }
  .rounded-md { border-radius: 6px; }
  .text-center { text-align: center; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .font-serif { font-family: Georgia, serif; }
  .text-base { font-size: 1rem; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }
  .font-medium { font-weight: 500; }
  .h-28 { height: 7rem; }
  .h-32 { height: 8rem; }
  .h-40 { height: 10rem; }
  .h-48 { height: 12rem; }
  .h-56 { height: 14rem; }
  .h-64 { height: 16rem; }
  @media (min-width: 640px) {
    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sm\\:h-32 { height: 8rem; }
    .sm\\:h-48 { height: 12rem; }
    .sm\\:h-64 { height: 16rem; }
    .sm\\:w-\\[calc\\(50\\%-0\\.375rem\\)\\] { width: calc(50% - 0.375rem); }
  }
  .maker-image-frame {
    overflow: hidden !important;
    width: 100%;
    border-radius: 6px;
  }
  .maker-upload-slot {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: 0 !important;
    background: transparent !important;
    overflow: hidden !important;
  }
  .maker-upload-slot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .quotation-print-sheet table {
    width: 100%;
    border-collapse: collapse;
  }
  .quotation-print-sheet th,
  .quotation-print-sheet td {
    border: 1px solid #111;
    padding: 6px 8px;
    font-size: 12px;
    vertical-align: top;
  }
  .quotation-print-sheet input {
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    width: 100%;
    font: inherit;
    color: inherit;
  }
  .quotation-print-sheet [contenteditable="true"] {
    outline: none !important;
  }
  .print-break-before { break-before: page; page-break-before: always; }
  .print-break-after { break-after: page; page-break-after: always; }
  .print-page-break { break-before: page; page-break-before: always; }
  [class*="border-dashed"] { border: none !important; }
  button { display: none !important; }
`;

async function blobUrlToDataUrl(url: string): Promise<string> {
  if (!url.startsWith("blob:")) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? url));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function inlineImages(root: ParentNode) {
  const imgs = root.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      img.setAttribute("src", await blobUrlToDataUrl(src));
    })
  );
}

function hasMeaningfulContent(el: Element): boolean {
  if (
    el.classList.contains("print-page-break") ||
    el.querySelector(".print-page-break")
  ) {
    return true;
  }
  if (el.querySelector("img, table, input, textarea, svg")) return true;
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0;
}

function isEmptyBreakOnly(el: Element): boolean {
  if (el.classList.contains("print-page-break")) {
    return !el.querySelector("img, table") && !(el.textContent ?? "").trim();
  }
  const breakEl = el.querySelector(".print-page-break");
  if (!breakEl) return false;
  return (
    !el.querySelector("img, table") &&
    !(el.textContent ?? "").trim() &&
    !el.querySelector("input")
  );
}

function stripEditorChrome(root: ParentNode) {
  root.querySelectorAll(".no-print").forEach((el) => el.remove());

  root.querySelectorAll(".maker-upload-slot").forEach((slot) => {
    if (!slot.querySelector("img")) {
      const frame = slot.closest(".maker-image-frame");
      (frame ?? slot).remove();
      return;
    }
    if (slot instanceof HTMLButtonElement) {
      const div = document.createElement("div");
      div.className = slot.className;
      div.innerHTML = slot.innerHTML;
      slot.replaceWith(div);
    }
  });

  root.querySelectorAll("button").forEach((el) => el.remove());

  // Drop empty layout wrappers (hidden empty image slots, etc.)
  const sheet =
    root instanceof HTMLElement && root.classList.contains("quotation-print-sheet")
      ? root
      : root.querySelector(".quotation-print-sheet");

  if (sheet) {
    sheet.classList.remove("min-h-[720px]", "shadow-sm", "p-6", "sm:p-10", "max-w-[860px]", "mx-auto");
    sheet.style.minHeight = "0";
    sheet.style.padding = "0";
    sheet.style.maxWidth = "none";
    sheet.style.margin = "0";
    sheet.style.width = "100%";

    const flow = sheet.querySelector(".flex.flex-wrap");
    if (flow) {
      Array.from(flow.children).forEach((child) => {
        if (child.querySelector(".print-page-break")) return;
        if (!hasMeaningfulContent(child)) {
          child.remove();
        }
      });

      // Never start the document with a forced page break (causes blank page 1)
      while (flow.firstElementChild) {
        const first = flow.firstElementChild;
        if (isEmptyBreakOnly(first)) {
          first.remove();
          continue;
        }
        first.classList.remove("print-page-break", "print-break-before");
        first
          .querySelectorAll(".print-page-break, .print-break-before")
          .forEach((el) => {
            el.classList.remove("print-page-break", "print-break-before");
          });
        break;
      }
    }
  }
}

export async function printQuotationSheet(title = "Quotation") {
  const sheet = document.querySelector(".quotation-print-sheet");
  if (!sheet) {
    window.print();
    return;
  }

  const clone = sheet.cloneNode(true) as HTMLElement;
  stripEditorChrome(clone);
  await inlineImages(clone);

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
  <style>${PRINT_STYLES}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const runPrint = () => {
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
  };

  if (doc.readyState === "complete") {
    window.setTimeout(runPrint, 300);
  } else {
    iframe.addEventListener("load", () => window.setTimeout(runPrint, 300), {
      once: true,
    });
  }
}
