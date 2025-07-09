import { ExtendedForecastData } from "../depletions/depletions";

/**
 * Rounds a number to one decimal place (tenths precision) for consistent display.
 * This should be used at the final display/export stage, not during aggregation.
 * @param num - The number to round
 * @returns The number rounded to one decimal place
 */
export const roundToTenth = (num: number | null | undefined): number => {
  const n = num || 0;
  return Math.round(n * 10) / 10;
};

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
    label: "VOL 9L",
    sublabel: "LY",
    value: "py_case_equivalent_volume",
    color: "#c7b8ea",
  },
  {
    id: 2,
    label: "VOL 9L",
    sublabel: "LC",
    value: "prev_published_case_equivalent_volume",
    color: "#9bb7f0",
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

      const existing = months[monthName];

      const safeValue = isNaN(value) ? 0 : value;

      months[monthName] = {
        value: (existing?.value || 0) + safeValue,
        isActual:
          Boolean(item.data_type?.includes("actual")) ||
          existing?.isActual ||
          false,
        isManuallyModified:
          Boolean(item.is_manual_input) ||
          existing?.isManuallyModified ||
          false,
        data_type:
          item.data_type ||
          existing?.data_type ||
          (months[monthName].isActual ? "actual_complete" : "forecast"),
      };
    }
  });

  return months;
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
