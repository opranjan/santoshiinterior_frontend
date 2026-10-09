type SlipPrintData = {
  title: string;
  monthLabel: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  payPeriod: string;
  paymentDate: string;
  status: string;
  amountPaid: string;
  ctc: string;
  gross: string;
  notice: string;
  netPaid: string;
  netSalary: string;
  earnings: Array<{ label: string; amount: string }>;
  deductions: Array<{ label: string; amount: string }>;
  totalDeductions: string;
  ctcRows: Array<{ label: string; amount: string }>;
  employerPf: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  logoUrl: string;
};

function esc(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLES = `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #1c1610;
    font-family: Georgia, "Times New Roman", serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 100%; max-width: 190mm; margin: 0 auto; }
  .bar {
    background: #c4a574;
    color: #1c1610;
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: Arial, sans-serif;
    font-weight: 700;
    font-size: 14px;
    border-radius: 8px 8px 0 0;
  }
  .body { border: 1px solid #eadfcf; border-top: 0; padding: 14px; border-radius: 0 0 8px 8px; }
  .brand { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .brand img { width: 42px; height: 42px; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 16px; }
  .brand p { margin: 0; font-size: 11px; color: #8a7b68; font-family: Arial, sans-serif; }
  table.meta { width: 100%; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 12px; }
  table.meta td { padding: 2px 0; vertical-align: top; }
  table.meta td.k { color: #8a7b68; width: 130px; }
  .paid { font-size: 22px; font-weight: 700; margin: 0; }
  .muted { color: #8a7b68; font-family: Arial, sans-serif; font-size: 11px; margin: 0 0 4px; }
  .badge {
    display: inline-block;
    background: #e7f6ec;
    color: #2f7a45;
    font-family: Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    margin-left: 8px;
  }
  .badge.pending { background: #f4ead8; color: #9a7748; }
  .kpis { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 12px 0; }
  .kpi { border: 1px solid #eadfcf; background: #fbf8f3; padding: 8px; border-radius: 8px; font-family: Arial, sans-serif; }
  .kpi span { display: block; font-size: 10px; color: #8a7b68; }
  .kpi strong { font-size: 12px; }
  .cols { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 10px; }
  .box { border: 1px solid #eadfcf; background: #fbf8f3; border-radius: 8px; overflow: hidden; margin-bottom: 8px; }
  .box h3 {
    margin: 0;
    padding: 8px 10px 4px;
    font-size: 12px;
    color: #9a7748;
    font-family: Arial, sans-serif;
  }
  .row, .head {
    display: flex;
    justify-content: space-between;
    padding: 5px 10px;
    font-family: Arial, sans-serif;
    font-size: 11px;
    border-top: 1px solid #eadfcf;
  }
  .total { background: #efe4d2; font-weight: 700; color: #6b4f24; }
  .net { background: #e8f7ee; color: #2f7a45; font-weight: 700; border-radius: 8px; padding: 8px 10px; font-family: Arial, sans-serif; font-size: 12px; display: flex; justify-content: space-between; }
  .note { font-family: Arial, sans-serif; font-size: 10px; color: #8a7b68; margin-top: 8px; }
`;

export function printSalarySlipPdf(data: SlipPrintData) {
  const paidClass = data.status.toLowerCase() === "paid" ? "" : " pending";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(data.title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="sheet">
    <div class="bar"><span>Salary Slip</span><span>${esc(data.monthLabel)}</span></div>
    <div class="body">
      <div class="brand">
        <img src="${esc(data.logoUrl)}" alt="Santoshi Interiors" />
        <div>
          <h1>Santoshi Interiors</h1>
          <p>Mumbai, Maharashtra</p>
        </div>
      </div>
      <table class="meta">
        <tr><td class="k">Employee Name</td><td>: ${esc(data.employeeName)}</td></tr>
        <tr><td class="k">Employee ID</td><td>: ${esc(data.employeeCode)}</td></tr>
        <tr><td class="k">Department</td><td>: ${esc(data.department)}</td></tr>
        <tr><td class="k">Designation</td><td>: ${esc(data.designation)}</td></tr>
        <tr><td class="k">Pay Period</td><td>: ${esc(data.payPeriod)}</td></tr>
        <tr><td class="k">Payment Date</td><td>: ${esc(data.paymentDate)}</td></tr>
      </table>
      <p class="muted">Amount Paid</p>
      <p class="paid">${esc(data.amountPaid)}<span class="badge${paidClass}">${esc(data.status)}</span></p>
      <div class="kpis">
        <div class="kpi"><span>Total CTC</span><strong>${esc(data.ctc)}</strong></div>
        <div class="kpi"><span>Gross Salary</span><strong>${esc(data.gross)}</strong></div>
        <div class="kpi"><span>Notice Retention</span><strong>${esc(data.notice)}</strong></div>
        <div class="kpi"><span>Net Paid</span><strong>${esc(data.netPaid)}</strong></div>
      </div>
      <div class="cols">
        <div>
          <div class="box">
            <h3>Earnings</h3>
            ${data.earnings.map((row) => `<div class="row"><span>${esc(row.label)}</span><span>${esc(row.amount)}</span></div>`).join("")}
            <div class="row total"><span>Gross Earnings (A)</span><span>${esc(data.gross)}</span></div>
          </div>
          <div class="box">
            <h3>Deductions</h3>
            ${data.deductions.map((row) => `<div class="row"><span>${esc(row.label)}</span><span>${esc(row.amount)}</span></div>`).join("")}
            <div class="row total"><span>Total Deductions (B)</span><span>${esc(data.totalDeductions)}</span></div>
          </div>
          <div class="net"><span>Net Salary (A − B)</span><span>${esc(data.netSalary)}</span></div>
        </div>
        <div>
          <div class="box">
            <h3>CTC Breakdown (Monthly)</h3>
            ${data.ctcRows.map((row) => `<div class="row"><span>${esc(row.label)}</span><span>${esc(row.amount)}</span></div>`).join("")}
            <div class="row total"><span>Total CTC</span><span>${esc(data.ctc)}</span></div>
          </div>
          <div class="box">
            <h3>Employer Contributions</h3>
            <div class="row"><span>Employer PF</span><span>${esc(data.employerPf)}</span></div>
          </div>
          <div class="box">
            <h3>Payment Details</h3>
            <div class="row"><span>Bank</span><span>${esc(data.bankName)}</span></div>
            <div class="row"><span>Account</span><span>${esc(data.accountNumber)}</span></div>
            <div class="row"><span>IFSC</span><span>${esc(data.ifsc)}</span></div>
            <div class="row"><span>Payment Date</span><span>${esc(data.paymentDate)}</span></div>
            <div class="row total"><span>Amount Paid</span><span>${esc(data.amountPaid)}</span></div>
          </div>
        </div>
      </div>
      <p class="note">System generated salary slip · Santoshi Interiors · Incentive is variable · Notice retention is released in Full &amp; Final.</p>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => iframe.remove();
  const runPrint = () => {
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    window.setTimeout(cleanup, 15000);
  };

  const imgs = Array.from(doc.images);
  const wait = imgs.length
    ? Promise.all(
        imgs.map(
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
      )
    : Promise.resolve();

  void wait.then(() => window.setTimeout(runPrint, 200));
}
