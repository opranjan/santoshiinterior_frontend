import type { CustomerWarrantyDto } from "@/services/crmApi";

function esc(value?: string | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function buildWarrantyReceiptHtml(row: CustomerWarrantyDto) {
  const items = row.coverageItems || [];
  const client = row.project?.clientName || "Customer";
  const project = row.project?.name || "Project";
  const phone = row.project?.phone || "";
  const receiptNo = `WR-${shortId(row.id)}`;

  const materialRows = items.length
    ? items
        .map(
          (item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>
          <div class="mat-title">${esc(item.title)}</div>
          ${
            item.vendorName
              ? `<div class="mat-sub">From vendor: ${esc(item.vendorName)}</div>`
              : ""
          }
        </td>
        <td>${esc(item.description || "—")}</td>
        <td class="center">${esc(formatDate(item.endsOn || row.endsOn))}</td>
      </tr>`
        )
        .join("")
    : `
      <tr>
        <td colspan="4" class="empty">No materials listed on this warranty.</td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(receiptNo)} · Warranty Receipt</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1c1610;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #fff;
    }
    .sheet { max-width: 820px; margin: 0 auto; }
    .header {
      background: #1c1610;
      color: #f3ece2;
      padding: 26px 28px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .brand h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: 0.02em; }
    .brand .tag { margin: 4px 0 0; color: #c4a574; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
    .brand .sub { margin: 10px 0 0; color: rgba(243,236,226,0.65); font-size: 11px; }
    .meta {
      min-width: 190px;
      text-align: right;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(196,165,116,0.35);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .meta .label {
      margin: 0;
      color: #c4a574;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .meta .id { margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #f3ece2; }
    .meta .line { margin: 4px 0 0; color: rgba(243,236,226,0.7); font-size: 11px; }
    .accent { height: 5px; background: #c4a574; }
    .body { padding: 22px 8px 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .eyebrow {
      margin: 0 0 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9a7748;
    }
    .name { margin: 0; font-size: 15px; font-weight: 700; color: #1c1610; }
    .muted { margin: 4px 0 0; color: #6b645b; font-size: 12px; }
    .summary {
      margin-top: 18px;
      border: 1px solid #eadfcf;
      background: #fbf8f3;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .summary p { margin: 0; color: #5c5348; white-space: pre-wrap; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      border: 1px solid #eadfcf;
      overflow: hidden;
    }
    thead th {
      background: #1c1610;
      color: #e8d5b5;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: left;
      padding: 11px 12px;
    }
    tbody td {
      padding: 12px;
      border-top: 1px solid #f0e8db;
      vertical-align: top;
      color: #5c5348;
    }
    tbody tr:nth-child(even) td { background: #fbf8f3; }
    .mat-title { font-weight: 700; color: #1c1610; }
    .mat-sub { margin-top: 3px; font-size: 11px; color: #8a7b68; }
    .center { text-align: center; }
    .empty { text-align: center; color: #8a7b68; padding: 24px !important; }
    .notes {
      margin-top: 18px;
      border: 1px solid #eadfcf;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .notes p { margin: 0; color: #5c5348; white-space: pre-wrap; }
    .signs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 42px;
    }
    .sign-line {
      width: 170px;
      height: 1px;
      background: #cfc3b0;
      margin-bottom: 36px;
    }
    .sign-line.right { margin-left: auto; }
    .sign-title { margin: 0; font-size: 12px; font-weight: 700; }
    .sign-sub { margin: 3px 0 0; font-size: 11px; color: #8a7b68; }
    .sign-right { text-align: right; }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #eadfcf;
      text-align: center;
      color: #8a7b68;
      font-size: 10px;
      line-height: 1.6;
    }
    .toolbar {
      padding: 14px 16px;
      text-align: center;
      background: #fbf8f3;
      border-bottom: 1px solid #eadfcf;
    }
    .toolbar button {
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 650;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-primary {
      border: 0;
      background: #1c1610;
      color: #e8d5b5;
    }
    .btn-ghost {
      margin-left: 8px;
      border: 1px solid #d9cbb8;
      background: #fff;
      color: #5c5348;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print toolbar">
    <button class="btn-primary" onclick="window.print()">Download PDF / Print</button>
    <button class="btn-ghost" onclick="window.close()">Close</button>
  </div>

  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>Warranty Receipt</h1>
        <p class="tag">Customer project coverage</p>
        <p class="sub">${esc(row.title || "Customer Project Warranty")}</p>
      </div>
      <div class="meta">
        <p class="label">Receipt</p>
        <p class="id">${esc(receiptNo)}</p>
        <p class="line">Issued: ${esc(formatDate(row.createdAt || row.startsOn))}</p>
        <p class="line">Valid: ${esc(formatDate(row.startsOn))} → ${esc(formatDate(row.endsOn))}</p>
      </div>
    </div>
    <div class="accent"></div>

    <div class="body">
      <div class="grid-2">
        <div>
          <p class="eyebrow">Customer</p>
          <p class="name">${esc(client)}</p>
          ${phone ? `<p class="muted">${esc(phone)}</p>` : ""}
        </div>
        <div>
          <p class="eyebrow">Project</p>
          <p class="name">${esc(project)}</p>
          <p class="muted">${esc(String(items.length))} material${items.length === 1 ? "" : "s"} covered</p>
        </div>
      </div>

      ${
        row.coverageSummary
          ? `<div class="summary">
        <p class="eyebrow">Coverage summary</p>
        <p>${esc(row.coverageSummary)}</p>
      </div>`
          : ""
      }

      <table>
        <thead>
          <tr>
            <th style="width:48px">#</th>
            <th>Material</th>
            <th>What we cover</th>
            <th style="width:110px">Ends on</th>
          </tr>
        </thead>
        <tbody>${materialRows}</tbody>
      </table>

      ${
        row.notes
          ? `<div class="notes">
        <p class="eyebrow">Notes</p>
        <p>${esc(row.notes)}</p>
      </div>`
          : ""
      }

      <div class="signs">
        <div>
          <div class="sign-line"></div>
          <p class="sign-title">Customer acknowledgement</p>
          <p class="sign-sub">Name &amp; signature</p>
        </div>
        <div class="sign-right">
          <div class="sign-line right"></div>
          <p class="sign-title">Authorized signatory</p>
          <p class="sign-sub">For the company</p>
        </div>
      </div>

      <div class="footer">
        This warranty receipt lists materials covered for the named project and customer.<br/>
        Keep this copy for claim / service reference.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function openWarrantyReceiptPrintWindow(row: CustomerWarrantyDto) {
  const html = buildWarrantyReceiptHtml(row);
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

export function warrantyReceiptNumber(row: CustomerWarrantyDto) {
  return `WR-${shortId(row.id)}`;
}

export { formatDate as formatWarrantyReceiptDate };
