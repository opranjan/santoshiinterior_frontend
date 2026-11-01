import type { CustomerWarrantyDto, WarrantyCoverageItemDto } from "@/services/crmApi";

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

export function warrantyMonthsLabel(
  start?: string | null,
  end?: string | null,
  item?: WarrantyCoverageItemDto | null
) {
  if (item?.durationMonths != null && Number(item.durationMonths) > 0) {
    const n = Number(item.durationMonths);
    return `${n} Month${n === 1 ? "" : "s"}`;
  }
  const from = start ? new Date(start) : null;
  const to = end ? new Date(end) : item?.endsOn ? new Date(item.endsOn) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  const months = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (30.4375 * 24 * 60 * 60 * 1000))
  );
  return `${months} Month${months === 1 ? "" : "s"}`;
}

export function warrantyReceiptNumber(row: CustomerWarrantyDto) {
  return `WR-${shortId(row.id)}`;
}

export function buildWarrantyReceiptHtml(row: CustomerWarrantyDto, assetOrigin = "") {
  const origin = assetOrigin.replace(/\/$/, "");
  const logoUrl = `${origin}/images/logo/santoshi-interiors.jpg`;
  const heroUrl = `${origin}/images/casual/hero-living-room.jpg`;
  const items = row.coverageItems || [];
  const client = row.project?.clientName || "Customer";
  const project = row.project?.name || "Project";
  const phone = row.project?.phone || "";
  const location = row.project?.address || "";
  const receiptNo = warrantyReceiptNumber(row);
  const issuedOn = formatDate(row.createdAt || row.startsOn);
  const validTill = formatDate(row.endsOn);

  const materialRows = items.length
    ? items
        .map((item, index) => {
          const ends = item.endsOn || row.endsOn;
          const period = warrantyMonthsLabel(row.startsOn, ends, item);
          return `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="mat">${esc(item.title)}</td>
        <td>${esc(item.description || "—")}</td>
        <td class="center"><span class="pill">${esc(period)}</span></td>
        <td class="center">${esc(formatDate(ends))}</td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" class="empty">No materials listed on this warranty.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(receiptNo)} · Warranty Card</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap");
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #2d2218;
      font-family: Manrope, "Segoe UI", sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #ece4d8;
    }
    .toolbar {
      padding: 14px 16px;
      text-align: center;
      background: #f7f0e6;
      border-bottom: 1px solid #e0d3c1;
    }
    .toolbar button {
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 650;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-primary { border: 0; background: #3a271c; color: #f3e7d5; }
    .btn-ghost { margin-left: 8px; border: 1px solid #d9cbb8; background: #fff; color: #5c5348; }
    .sheet {
      max-width: 900px;
      margin: 18px auto;
      background: #fffdf9;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 18px 50px rgba(58, 39, 28, 0.16);
    }
    .top {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      min-height: 210px;
      background: linear-gradient(180deg, #f7f0e6 0%, #fffdf9 100%);
    }
    .brand-wrap { padding: 22px 24px 18px; }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand img {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
    }
    .brand h1 {
      margin: 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      color: #3a271c;
      line-height: 1;
    }
    .brand .tag {
      margin: 5px 0 0;
      color: #b08a4a;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .hero {
      margin: 16px 0 0;
      height: 118px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #eadfcf;
    }
    .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .badge-panel {
      position: relative;
      background: #3a271c;
      color: #fffdf9;
      padding: 28px 28px 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%);
      padding-left: 48px;
    }
    .crest {
      width: 54px;
      height: 54px;
      border-radius: 999px;
      border: 2px solid #c4a574;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c4a574;
      font-size: 22px;
      margin-bottom: 12px;
      background: rgba(196,165,116,0.08);
    }
    .badge-panel h2 {
      margin: 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 34px;
      font-weight: 700;
      line-height: 1;
    }
    .badge-panel .sub {
      margin: 8px 0 0;
      color: #c4a574;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .body { padding: 8px 22px 18px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      border: 1px solid #eadfcf;
      border-radius: 14px;
      padding: 14px 16px;
      background: #fff;
    }
    .label {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #9a7748;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .value {
      margin: 8px 0 0;
      font-size: 18px;
      font-weight: 700;
      color: #2d2218;
    }
    .meta { margin: 4px 0 0; color: #7a6f62; font-size: 12px; }
    .meta-row {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      border: 1px solid #eadfcf;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }
    .meta-cell {
      padding: 12px 14px;
      border-right: 1px solid #f0e8db;
    }
    .meta-cell:last-child { border-right: 0; }
    .meta-cell .value { font-size: 15px; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 16px;
      border: 1px solid #eadfcf;
      border-radius: 14px;
      overflow: hidden;
    }
    thead th {
      background: #3a271c;
      color: #f3e7d5;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: left;
      padding: 12px;
    }
    tbody td {
      padding: 12px;
      border-top: 1px solid #f0e8db;
      vertical-align: middle;
      color: #5c5348;
      background: #fff;
    }
    tbody tr:nth-child(even) td { background: #fbf7f1; }
    td.mat { font-weight: 700; color: #2d2218; }
    .center { text-align: center; }
    .empty { text-align: center; color: #8a7b68; padding: 24px !important; }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 88px;
      padding: 5px 10px;
      border-radius: 999px;
      background: #f4e6d0;
      color: #8a5f24;
      font-size: 11px;
      font-weight: 700;
    }
    .bottom {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1.25fr 0.75fr 0.75fr;
      gap: 12px;
    }
    .terms {
      border-radius: 14px;
      background: #f7f0e6;
      border: 1px solid #eadfcf;
      padding: 14px 16px;
    }
    .terms h3 {
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #3a271c;
    }
    .terms ul {
      margin: 0;
      padding-left: 18px;
      color: #6b645b;
      font-size: 11px;
    }
    .terms li { margin: 5px 0; }
    .sign {
      border: 1px solid #eadfcf;
      border-radius: 14px;
      padding: 14px 16px;
      background: #fff;
      min-height: 120px;
    }
    .sign h3 {
      margin: 0 0 28px;
      font-size: 12px;
      font-weight: 700;
      color: #3a271c;
    }
    .sign-line {
      width: 100%;
      height: 1px;
      background: #d9cbb8;
      margin-top: 34px;
    }
    .sign p { margin: 8px 0 0; color: #8a7b68; font-size: 11px; }
    .sign.right { text-align: right; }
    .footer {
      margin-top: 16px;
      background: #3a271c;
      color: #f3e7d5;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 18px;
      font-size: 11px;
    }
    @media print {
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .sheet { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="no-print toolbar">
    <button class="btn-primary" onclick="window.print()">Download PDF / Print</button>
    <button class="btn-ghost" onclick="window.close()">Close</button>
  </div>

  <div class="sheet">
    <div class="top">
      <div class="brand-wrap">
        <div class="brand">
          <img src="${esc(logoUrl)}" alt="Santoshi Interiors" />
          <div>
            <h1>Santoshi Interiors®</h1>
            <p class="tag">Design · Build · Deliver</p>
          </div>
        </div>
        <div class="hero">
          <img src="${esc(heroUrl)}" alt="" />
        </div>
      </div>
      <div class="badge-panel">
        <div class="crest">✓</div>
        <h2>Warranty Card</h2>
        <p class="sub">Customer Project Coverage</p>
      </div>
    </div>

    <div class="body">
      <div class="info-grid">
        <div class="card">
          <p class="label">👤 Customer</p>
          <p class="value">${esc(client)}</p>
          ${phone ? `<p class="meta">${esc(phone)}</p>` : ""}
        </div>
        <div class="card">
          <p class="label">▣ Project</p>
          <p class="value">${esc(project)}</p>
          ${location ? `<p class="meta">📍 ${esc(location)}</p>` : `<p class="meta">${esc(row.title || "Customer Project Warranty")}</p>`}
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-cell">
          <p class="label">Warranty No.</p>
          <p class="value">${esc(receiptNo)}</p>
        </div>
        <div class="meta-cell">
          <p class="label">Issued On</p>
          <p class="value">${esc(issuedOn)}</p>
        </div>
        <div class="meta-cell">
          <p class="label">Valid Till</p>
          <p class="value">${esc(validTill)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:42px">#</th>
            <th>Material / Work</th>
            <th>What We Cover</th>
            <th style="width:120px">Warranty Period</th>
            <th style="width:110px">Ends On</th>
          </tr>
        </thead>
        <tbody>${materialRows}</tbody>
      </table>

      <div class="bottom">
        <div class="terms">
          <h3><span style="color:#c4a574">✓</span> Warranty Terms</h3>
          <ul>
            <li>Covers manufacturing defects in workmanship and supplied materials listed above.</li>
            <li>Valid only for the named project and customer during the warranty period.</li>
            <li>Does not cover misuse, water damage, alterations, or normal wear &amp; tear.</li>
            <li>Claims must be raised within the warranty period with this card.</li>
          </ul>
        </div>
        <div class="sign">
          <h3>Customer Acknowledgement</h3>
          <div class="sign-line"></div>
          <p>Name &amp; Signature</p>
        </div>
        <div class="sign right">
          <h3>Authorized Signatory</h3>
          <div class="sign-line"></div>
          <p>For Santoshi Interiors</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>☎ +91 98765 43210</span>
      <span>✉ support@santoshiinteriors.in</span>
      <span>🌐 www.santoshiinteriors.in</span>
    </div>
  </div>
</body>
</html>`;
}

export function openWarrantyReceiptPrintWindow(row: CustomerWarrantyDto) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const html = buildWarrantyReceiptHtml(row, origin);
  const win = window.open("", "_blank", "width=980,height=1200");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

export { formatDate as formatWarrantyReceiptDate };
