import { ProductEntry } from "../scanComponents/scanSidebarProducts";
import { generatePrice, generateQD, generateRetailerMargin, generateLoyalty } from "../scanPlayData/scanDataFn";

export interface PlannerRow {
  id: string; // unique id clusterId|productIdx|weekIdx
  clusterId: string;
  market: string;
  account: string;
  brand: string;
  product: string;
  week: string; // locale date string e.g., 1/8/2024
  month: string; // JAN-DEC
  scanAmount: number; // $ value entered for the scan
  projectedScan: number; // projected volume for this scan occurrence
  projectedRetail: number;
  qd: number;
  retailerMargin: number;
  loyalty: number;
  // Persisted Nielsen LY monthly sales trend for the product (12 values JAN-DEC)
  nielsenTrend?: { month: string; value: number }[];
  // Growth rate applied when projecting sales for this product (decimal, e.g., 0.05 for 5%)
  growthRate?: number;
  status?: "draft" | "review" | "approved";
  rowType?: "week"; // flag retained for backward compatibility – may be removed later
}

const MONTHS = [
  "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"
];

// helper to derive brand from product name
const getBrand = (productName: string) => {
  const parts = productName.split(" - ");
  if (parts.length >= 2) {
    const namePart = parts[1].trim();
    return namePart.split(" ")[0];
  }
  return productName;
};

export function buildPlannerRows(
  cluster: { market: string; account: string; products: ProductEntry[] },
  clusterId: string,
  status: "draft" | "review" | "approved" = "draft"
): PlannerRow[] {
  const rows: PlannerRow[] = [];
  cluster.products.forEach((prod, pIdx) => {
    if (!prod.scans || prod.scans.length === 0) return; // skip products with no scans
    prod.scans.forEach((scan, sIdx) => {
      if (!scan.week) return; // guard against malformed scan entries
      // derive month and projected values
      const dateObj = new Date(scan.week);
      if (isNaN(dateObj.getTime())) return; // skip invalid dates
      const monthIdx = dateObj.getMonth();
      const month = MONTHS[monthIdx];
      const trendVal = prod.nielsenTrend?.[monthIdx]?.value ?? 0;
      // If projectedScan already calculated and stored, reuse it; otherwise compute fresh
      const projectedScan =
        scan.projectedScan !== undefined
          ? scan.projectedScan
          : (() => {
              const projectedMonthly =
                Math.round(trendVal * (1 + (prod.growthRate || 0)) * 10) / 10;
              return projectedMonthly * scan.scan;
            })();

      rows.push({
        id: `${clusterId}|${pIdx}|${sIdx}`,
        clusterId,
        market: cluster.market,
        account: cluster.account,
        brand: getBrand(prod.name),
        product: prod.name,
        week: scan.week,
        month,
        scanAmount: scan.scan,
        projectedScan,
        projectedRetail: scan.projectedRetail ?? generatePrice(),
        qd: scan.qd ?? generateQD(),
        retailerMargin: scan.retailerMargin ?? generateRetailerMargin(),
        loyalty: scan.loyalty ?? generateLoyalty(),
        nielsenTrend: prod.nielsenTrend,
        growthRate: prod.growthRate,
        status,
        rowType: "week",
      });
    });
  });
  return rows;
}
