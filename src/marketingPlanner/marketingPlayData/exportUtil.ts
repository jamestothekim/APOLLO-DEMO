import { MarketingProgram, MARKETS, BRANDS, PROGRAMS } from "./marketingData";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function exportMarketingToCSV(data: MarketingProgram[], filename = "marketing_data.csv") {
  const headers = [
    "Market",
    "Brand",
    "Program",
    "Total TY",
    ...MONTH_NAMES,
    "Notes"
  ];

  const rows = data.map((item) => {
    const market = MARKETS.find((m) => m.id === item.market)?.name || item.market;
    const brand = BRANDS.find((b) => b.id === item.brand)?.name || item.brand;
    const program = PROGRAMS.find((p) => p.id === item.program)?.program_name || item.program;
    const totalTY = item.total_ty;
    const months = MONTH_NAMES.map((month) => item.months[month] || 0);
    return [market, brand, program, totalTY, ...months, item.notes || ""];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell ?? "");
          if (stringCell.includes(",") || stringCell.includes('"')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 