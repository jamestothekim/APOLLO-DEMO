import { ChainForecastData } from "../../redux/slices/chainSlice";

// Month names helper
export const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// --- CSV Helper ---
const downloadCsv = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Escape CSV value
const esc = (v: any): string => `"${String(v ?? "").replace(/"/g, '""')}"`;

// --- Planner CSV ---
export const exportPlannerCsv = (
  rows: ChainForecastData[],
  fileName: string = "chain_planner.csv"
) => {
  const headers = ["Market", "Chain", "Product", ...MONTH_NAMES, "Total"];
  const lines = rows.map((r) => {
    const monthVals = MONTH_NAMES.map((m) => r.months[m]?.value ?? 0);
    const total = monthVals.reduce((s, v) => s + v, 0);
    return [r.market, r.chain, r.product, ...monthVals, total]
      .map(esc)
      .join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  downloadCsv(csv, fileName);
};

// --- Summary CSV (generic) ---
export interface SummaryLikeRow {
  market: string;
  chain?: string;
  brand?: string;
  months: { [key: string]: number };
  total: number;
  level: number;
}

export const exportSummaryCsv = (
  rows: SummaryLikeRow[],
  fileName: string = "chain_summary.csv"
) => {
  const headers = ["Market", "Chain", "Brand", ...MONTH_NAMES, "Total"];
  const lines = rows.map((r) => {
    const monthVals = MONTH_NAMES.map((m) => r.months[m] ?? 0);
    return [r.market, r.chain || "", r.brand || "", ...monthVals, r.total]
      .map(esc)
      .join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  downloadCsv(csv, fileName);
};
