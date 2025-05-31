import { ExtendedForecastData } from "../depletions/depletions";
import type { Guidance } from "../../redux/slices/userSettingsSlice";

export type ForecastOption = {
  id: number;
  label: string;
  value: string;
};

export const FORECAST_OPTIONS: ForecastOption[] = [
  { id: 1, label: "Three Month", value: "three_month" },
  { id: 2, label: "Six Month", value: "six_month" },
  { id: 3, label: "Twelve Month", value: "twelve_month" },
  { id: 4, label: "Flat", value: "flat" },
  { id: 5, label: "Run Rate", value: "run_rate" },
];

export const SIDEBAR_GUIDANCE_OPTIONS = [
  {
    id: 1,
    label: "Last Year (LY)",
    value: "py_case_equivalent_volume",
    color: "#c7b8ea",
  },
];

export type ForecastLogic = (typeof FORECAST_OPTIONS)[number]["value"];

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

  const actualMonths = new Set<(typeof MONTH_NAMES)[number]>();
  let hasAnyActuals = false;
  data.forEach((item) => {
    if (item?.data_type?.includes("actual")) {
      hasAnyActuals = true;
      const monthName = MONTH_NAMES[item.month - 1];
      if (monthName) {
        actualMonths.add(monthName);
      }
    }
  });

  const lastActualMonthIndex =
    hasAnyActuals && actualMonths.size > 0
      ? Math.max(...Array.from(actualMonths).map((m) => MONTH_NAMES.indexOf(m)))
      : -1;

  MONTH_NAMES.forEach((month, index) => {
    const shouldBeActual = hasAnyActuals && index <= lastActualMonthIndex;

    months[month] = {
      value: 0,
      isActual: shouldBeActual,
      isManuallyModified: false,
      data_type: shouldBeActual ? "actual_complete" : "forecast",
    };
  });

  data.forEach((item) => {
    if (item?.month && item.case_equivalent_volume !== undefined) {
      const monthName = MONTH_NAMES[item.month - 1];
      if (!monthName) {
        return;
      }

      const value = Math.round(Number(item.case_equivalent_volume) * 10) / 10;
      months[monthName] = {
        value: isNaN(value) ? 0 : value,
        isActual: Boolean(item.data_type?.includes("actual")),
        isManuallyModified: Boolean(item.is_manual_input),
        data_type:
          item.data_type ||
          (months[monthName].isActual ? "actual_complete" : "forecast"),
      };
    }
  });

  return months;
};

export interface ExportableData {
  market_id: string | number;
  market_name: string;
  customer_id?: string;
  customer_name?: string;
  product: string;
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  forecastLogic: string;
  py_case_equivalent_volume?: number;
  py_gross_sales_value?: number;
  gross_sales_value?: number;
  case_equivalent_volume?: number;
  months: {
    [key: string]: {
      value: number;
      isActual?: boolean;
      isManuallyModified?: boolean;
    };
  };
  [key: string]: any;
}

export const exportToCSV = (
  data: ExportableData[],
  selectedGuidance?: Guidance[],
  isSummaryView: boolean = false,
  lastActualMonthIndex: number = -1
) => {
  const monthKeys = MONTH_NAMES;

  let baseHeaders: string[];
  let dataRows: string[][];

  if (isSummaryView) {
    baseHeaders = ["BRAND / VARIANT", "VOL 9L (TY)", "VOL 9L (LY)"];

    const guidanceHeaders =
      selectedGuidance?.map((guidance) =>
        guidance.sublabel
          ? `${guidance.label} (${guidance.sublabel})`
          : guidance.label
      ) || [];

    const monthHeaders = monthKeys.map((month, index) => {
      const label = index <= lastActualMonthIndex ? "(ACT)" : "(FCST)";
      return `${month} ${label}`;
    });

    const headerRow = [...baseHeaders, ...guidanceHeaders, ...monthHeaders];

    dataRows = data.map((item) => {
      const brandVariant = item.isBrandRow ? item.brand : item.variant || "";

      const totalVolumeTY = item.case_equivalent_volume ?? 0;
      const formattedTotalTY = totalVolumeTY.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      const totalVolumeLY = item.py_case_equivalent_volume ?? 0;
      const formattedTotalLY = totalVolumeLY.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      const baseColumns = [brandVariant, formattedTotalTY, formattedTotalLY];

      const guidanceColumns =
        selectedGuidance?.map((guidance) => {
          const valueKey = `guidance_${guidance.id}`;
          const value = item[valueKey];

          if (value === undefined || isNaN(value)) return "";

          if (guidance.calculation.format === "percent") {
            return `${Math.round(value * 100)}%`;
          } else if (
            guidance.label.toLowerCase().includes("gsv") &&
            !guidance.label.toLowerCase().includes("%")
          ) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          } else {
            return value.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
          }
        }) || [];

      const monthValues = monthKeys.map((month) => {
        const value = item.months[month]?.value || 0;
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      });

      return [...baseColumns, ...guidanceColumns, ...monthValues];
    });

    const processedRows = dataRows.map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell ?? "");
          if (stringCell.includes(",") || stringCell.includes('"')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        })
        .join(",")
    );
    const csvContent = [headerRow.join(","), ...processedRows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "summary_forecast_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    baseHeaders = [
      "Market",
      ...(data.some((row) => row.customer_name) ? ["Customer"] : []),
      "Product",
      "Forecast Logic",
      "VOL 9L (TY)",
    ];

    const guidanceHeaders =
      selectedGuidance?.map((guidance) =>
        guidance.sublabel
          ? `${guidance.label} (${guidance.sublabel})`
          : guidance.label
      ) || [];

    const monthHeaders = monthKeys.map((month) => {
      const firstRow = data[0];
      const isActual =
        lastActualMonthIndex !== -1
          ? MONTH_NAMES.indexOf(month) <= lastActualMonthIndex
          : firstRow?.months[month]?.isActual;
      return `${month} ${isActual ? "(ACT)" : "(FCST)"}`;
    });

    const headerRow = [
      ...baseHeaders,
      ...guidanceHeaders,
      ...monthHeaders,
      "Commentary",
    ];

    dataRows = data.map((item) => {
      const totalVolume = calculateTotal(item.months);
      const formattedTotal = totalVolume.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      const baseColumns = [
        item.market_name,
        ...(data.some((r) => r.customer_name)
          ? [item.customer_name || ""]
          : []),
        item.product.includes(" - ")
          ? item.product.split(" - ")[1]
          : item.product,
        item.forecastLogic,
        formattedTotal,
      ];

      const guidanceColumns =
        selectedGuidance?.map((guidance) => {
          const valueKey = `guidance_${guidance.id}`;
          const value =
            typeof guidance.value === "string"
              ? item[guidance.value]
              : item[valueKey];

          if (value === undefined || isNaN(value)) return "";

          if (guidance.calculation.format === "percent") {
            return `${Math.round(value * 100)}%`;
          } else if (
            guidance.label.toLowerCase().includes("gsv") &&
            !guidance.label.toLowerCase().includes("%")
          ) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          } else {
            return value.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
          }
        }) || [];

      const monthValues = monthKeys.map((month) => {
        const value = item.months[month]?.value || 0;
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      });

      return [
        ...baseColumns,
        ...guidanceColumns,
        ...monthValues,
        item.commentary || "",
      ];
    });

    const processedRows = dataRows.map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell ?? "");
          if (stringCell.includes(",") || stringCell.includes('"')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        })
        .join(",")
    );

    const csvContent = [headerRow.join(","), ...processedRows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "forecast_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const hasNonZeroTotal = (row: ExtendedForecastData): boolean => {
  if (!row || !row.months || typeof row.months !== "object") {
    return false;
  }

  const total = (Object.values(row.months) as { value: number }[]).reduce(
    (sum, { value }) => {
      const numValue = Number(value);
      return !isNaN(numValue) ? sum + numValue : sum;
    },
    0
  );
  return total > 0.0001;
};

export const calculateTotal = (months: { [key: string]: any }) => {
  return Object.values(months).reduce((sum, month) => {
    const value =
      month.isCurrentMonth &&
      month.projectedValue !== undefined &&
      !month.isManuallyModified
        ? month.projectedValue
        : month.value;
    return sum + (value || 0);
  }, 0);
};
