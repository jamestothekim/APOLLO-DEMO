import ExcelJS from "exceljs";
import { SCAN_PRODUCTS } from "../scanPlayData/scanData";

// Quick export utility for the Scan Planner. Generates one worksheet listing every row.
// rows: array of objects that at least include market, account, brand, week, scanAmount, projectedScan.
export async function exportScanPlanToExcel(rows: any[]) {
  if (!rows || rows.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Scan Plan");

  // Header
  const headers = [
    "Market",
    "Account",
    "Brand",
    "Product",
    "Week",
    "Scan $",
    "Projected Scan Vol",
  ];
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };

  // Data rows
  rows.forEach((r) => {
    ws.addRow([
      r.market,
      r.account,
      r.brand,
      r.product,
      r.week,
      r.scanAmount,
      r.projectedScan,
    ]);
  });

  // Column widths
  const widthMap = [15, 20, 15, 25, 15, 12, 18];
  widthMap.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  // Currency format for scanAmount
  ws.getColumn(6).numFmt = '"$"#,##0.00';
  // Number format for projectedScan
  ws.getColumn(7).numFmt = '#,##0.0';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scan_plan_${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

// Returns the scan factor (bottles per 9L) for a given product name (variant_size_desc)
export function getScanFactorPer9L(productName: string): number {
  for (const group of SCAN_PRODUCTS) {
    for (const prod of Array.isArray(group) ? group : [group]) {
      if (prod.variant_size_desc === productName) {
        // e.g. size_pack_desc: "6x750" => bottles = 6
        const bottles = parseInt((prod.size_pack_desc || "").split("x")[0], 10) || 1;
        const factor = prod.case_equivalent_factor || 1;
        return bottles / factor;
      }
    }
  }
  return 12; // fallback: 12 bottles per 9L (standard)
}

// Given a product name and scan $ per bottle, returns projected scan $ per 9L Nielsen sale
export function getProjectedScanDollars(productName: string, scanPerBottle: number): number {
  const scanFactor = getScanFactorPer9L(productName);
  return scanFactor * scanPerBottle;
}
