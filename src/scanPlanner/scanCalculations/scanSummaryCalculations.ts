import type { ScanPlannerRow } from "../../redux/slices/scanSlice";

export interface SummaryRow {
  id: string; // market|brand
  market: string;
  brand: string;
  tyBud: number; // placeholder until budget feed
  months: { [month: string]: number };
  total: number;
}

const MONTHS = [
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"
];

export function aggregatePlannerRows(rows: ScanPlannerRow[]): SummaryRow[] {
  if (!rows || rows.length === 0) return [];
  const map = new Map<string, SummaryRow>();
  rows.forEach((r) => {
    if (!r.month) return;
    const key = `${r.market}|${r.brand}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        market: r.market,
        brand: r.brand,
        tyBud: 0,
        months: MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as any),
        total: 0,
      });
    }
    const sr = map.get(key)!;
    const monthKey = r.month.toLowerCase();
    if ((sr.months as any)[monthKey] !== undefined) {
      const inc = r.projectedScan;
      (sr.months as any)[monthKey] += inc;
      sr.total += inc;
    }
  });
  // set tyBud equal total for each summary row
  map.forEach((sr) => {
    sr.tyBud = sr.total;
  });
  return Array.from(map.values());
}
