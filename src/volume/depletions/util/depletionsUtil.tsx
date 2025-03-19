import { ExtendedForecastData } from "../depletions";

export type ForecastOption = {
  id: number;
  label: string;
  value: string;
};

export const FORECAST_OPTIONS: ForecastOption[] = [
  { id: 1, label: "Two Month", value: "two_month" },
  { id: 2, label: "Three Month", value: "three_month" },
  { id: 3, label: "Six Month", value: "six_month" },
  { id: 4, label: "Nine Month", value: "nine_month" },
  { id: 5, label: "Flat", value: "flat" },
  { id: 6, label: "Run Rate", value: "run_rate" },
];

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
] as const;

export const MONTH_MAPPING: { [key: string]: number } = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

export const processMonthData = (data: any[]) => {
  const months: { [key: string]: any } = {};

  // Initialize all months with zero values
  MONTH_NAMES.forEach((month) => {
    months[month] = {
      value: 0,
      isActual: false,
      isManuallyModified: false,
    };
  });

  data.forEach((item) => {
    if (item?.month && item.case_equivalent_volume !== undefined) {
      const monthName = MONTH_NAMES[item.month - 1];
      if (!monthName) {
        console.warn("Invalid month index:", item.month);
        return;
      }

      const value = Math.round(Number(item.case_equivalent_volume));
      months[monthName] = {
        value: isNaN(value) ? 0 : value,
        isActual: Boolean(item.data_type?.includes("actual")),
        isManuallyModified: Boolean(item.is_manual_input),
      };
    }
  });

  return months;
};

export const exportToCSV = (data: ExtendedForecastData[]) => {
  const monthKeys = MONTH_NAMES;
  const headers = [
    "Market",
    "Product",
    "Brand",
    "Variant",
    "Forecast Logic",
    ...monthKeys,
    "Total",
  ].join(",");

  const rows = data.map((row) => {
    const monthValues = monthKeys.map((month) => row.months[month]?.value || 0);
    const total = monthValues.reduce((sum, val) => sum + val, 0);

    return [
      row.market_name,
      row.product,
      row.brand,
      row.variant,
      row.forecastLogic,
      ...monthValues,
      total,
    ].join(",");
  });

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "forecast_data.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const hasNonZeroTotal = (row: ExtendedForecastData): boolean => {
  const total = Object.values(row.months).reduce((sum, { value }) => {
    const numValue = Number(value);
    return !isNaN(numValue) ? sum + numValue : sum;
  }, 0);
  return total > 0.0001;
};

export const calculateTotal = (
  months: ExtendedForecastData["months"]
): number => {
  return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
};
