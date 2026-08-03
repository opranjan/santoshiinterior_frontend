const fs = require("fs");
const path = require("path");
const root = "C:/Users/omprakash ranjan/Desktop/mukesh/crm/frontend/src/components";

const files = [
  "work-orders/WorkOrdersTable.tsx",
  "payments/PaymentsTable.tsx",
  "purchase-orders/PurchaseOrdersTable.tsx",
  "warranty/WarrantyDeskTable.tsx",
];

for (const rel of files) {
  const file = path.join(root, rel);
  let s = fs.readFileSync(file, "utf8");
  // Rename hardcoded const so it doesn't collide
  s = s.replace(
    /const projectOptions = \[/,
    "const legacyProjectOptions = ["
  );
  // Point runtime usages to API-loaded projects
  s = s.replace(/projectOptions/g, "apiProjects");
  // Fix accidental rename of legacy const back if any
  s = s.replace(
    /const legacyApiProjects = \[/,
    "const legacyProjectOptions = ["
  );
  // emptyForm defaults that referenced apiProjects[0] before load
  s = s.replace(
    /projectId: apiProjects\[0\]\.id,/g,
    'projectId: "",'
  );
  s = s.replace(
    /siteAddress: apiProjects\[0\]\.address,/g,
    'siteAddress: "",'
  );
  fs.writeFileSync(file, s);
  console.log("rewired projects in", rel);
}
