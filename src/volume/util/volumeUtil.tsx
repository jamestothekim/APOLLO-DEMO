import { ExtendedForecastData } from "../depletions/depletions";
import { Box } from "@mui/material";
import type { GuidanceForecastOption } from "../../reusableComponents/quantSidebar";
import type { RawDepletionForecastItem } from "../../redux/slices/depletionSlice";
import type { RestoredState } from "../../redux/slices/pendingChangesSlice";
import type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from "../summary/summary";
import type { SummaryCalculationsState } from "../../redux/slices/guidanceCalculationsSlice";
import { MarketData } from "../volumeForecast";
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

  const total = Object.values(row.months).reduce((sum, { value }) => {
    const numValue = Number(value);
    return !isNaN(numValue) ? sum + numValue : sum;
  }, 0);
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

export const recalculateGuidance = (
  row: any,
  selectedGuidance: Guidance[]
): any => {
  if (!selectedGuidance || selectedGuidance.length === 0) {
    return row;
  }

  const updatedRow = { ...row };

  const totalVolume = calculateTotal(updatedRow.months);
  updatedRow.case_equivalent_volume = totalVolume;

  if (updatedRow.py_case_equivalent_volume && updatedRow.py_gross_sales_value) {
    const volumeRatio =
      updatedRow.py_case_equivalent_volume > 0
        ? totalVolume / updatedRow.py_case_equivalent_volume
        : 1;

    const estimatedGSV = updatedRow.py_gross_sales_value * volumeRatio;

    const currentGSV = updatedRow.gross_sales_value || 0;
    if (
      Math.abs((estimatedGSV - currentGSV) / Math.max(currentGSV, 1)) > 0.001
    ) {
      updatedRow.gross_sales_value = estimatedGSV;
    }
  }

  if (updatedRow.gross_sales_value === undefined) {
    updatedRow.gross_sales_value = 0;
  }

  if (updatedRow.py_gross_sales_value === undefined) {
    updatedRow.py_gross_sales_value = 0;
  }

  const tyGsvRate =
    updatedRow.gsv_rate ??
    (totalVolume > 0 ? (updatedRow.gross_sales_value || 0) / totalVolume : 0);

  if (
    updatedRow.lc_gross_sales_value === undefined &&
    updatedRow.prev_published_case_equivalent_volume !== undefined
  ) {
    updatedRow.lc_gross_sales_value =
      (updatedRow.prev_published_case_equivalent_volume || 0) * tyGsvRate;
  }

  selectedGuidance.forEach((guidance) => {
    if (
      guidance.calculation.type === "direct" &&
      typeof guidance.value === "string"
    ) {
      updatedRow[`guidance_${guidance.id}`] = updatedRow[guidance.value] ?? 0;
    } else if (guidance.calculation.type === "multi_calc") {
      const results: { [subId: string]: number } = {};
      guidance.calculation.subCalculations.forEach((subCalc) => {
        const cyValue = Number(updatedRow[subCalc.cyField]) || 0;
        const pyValue = Number(updatedRow[subCalc.pyField]) || 0;

        let subResult = 0;
        if (subCalc.calculationType === "percentage") {
          subResult = pyValue === 0 ? 0 : (cyValue - pyValue) / pyValue;
        } else if (subCalc.calculationType === "difference") {
          subResult = cyValue - pyValue;
        } else if (subCalc.calculationType === "direct") {
          subResult = cyValue;
        }

        results[subCalc.id] = subResult;
      });

      updatedRow[`guidance_${guidance.id}`] = results;
    } else if (guidance.value !== null && typeof guidance.value === "object") {
      if (
        guidance.calculation.type === "difference" &&
        "expression" in guidance.value
      ) {
        const expressionParts = guidance.value.expression.split(" - ");
        const field1 = expressionParts[0].trim();
        const field2 = expressionParts[1].trim();
        const value1 =
          field1 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field1];
        const value2 =
          field2 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field2];
        const result = (Number(value1) || 0) - (Number(value2) || 0);
        updatedRow[`guidance_${guidance.id}`] = result;
      } else if (
        guidance.calculation.type === "percentage" &&
        "numerator" in guidance.value &&
        "denominator" in guidance.value
      ) {
        const numeratorParts = guidance.value.numerator.split(" - ");
        const numerField1 = numeratorParts[0].trim();
        const numerField2 = numeratorParts[1].trim();
        const denomField = guidance.value.denominator.trim();
        const numerValue1 =
          numerField1 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[numerField1];
        const numerValue2 =
          numerField2 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[numerField2];
        const denomValue =
          denomField === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[denomField];
        const numerator =
          (Number(numerValue1) || 0) - (Number(numerValue2) || 0);
        const denominator = Number(denomValue) || 0;
        const result = denominator === 0 ? 0 : numerator / denominator;
        updatedRow[`guidance_${guidance.id}`] = result;
      }
    }
  });

  return updatedRow;
};

export const formatGuidanceValue = (
  value: number | undefined,
  format: string = "number",
  guidanceType?: string
): React.ReactNode => {
  if (value === undefined || isNaN(value)) return "-";
  if (value === Infinity || value === -Infinity) return "-";

  const roundedValue = Math.round(value * 100) / 100;
  const isNegative = roundedValue < 0;

  if (format === "percent") {
    const formattedValue =
      Math.round(roundedValue * 100).toLocaleString() + "%";

    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {formattedValue}
      </Box>
    ) : (
      formattedValue
    );
  }

  if (
    guidanceType &&
    guidanceType.toLowerCase().includes("gsv") &&
    !guidanceType.toLowerCase().includes("%")
  ) {
    const formattedValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(roundedValue));

    const accountingValue = isNegative ? `(${formattedValue})` : formattedValue;

    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {accountingValue}
      </Box>
    ) : (
      accountingValue
    );
  }

  const formattedValue = roundedValue.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return isNegative ? (
    <Box component="span" sx={{ color: "error.main" }}>
      {formattedValue}
    </Box>
  ) : (
    formattedValue
  );
};

export interface GuidanceMonthlyValueData {
  [key: string]: number[];
}

export interface GuidanceDataSourceInput {
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  py_case_equivalent_volume?: number;
  py_gross_sales_value?: number;
  gross_sales_value?: number;
  case_equivalent_volume?: number;
  [key: string]: any;
}

export const getGuidanceDataForSidebar = (
  data: GuidanceDataSourceInput,
  guidanceOptions: GuidanceForecastOption[]
): GuidanceMonthlyValueData => {
  const sidebarGuidanceData: GuidanceMonthlyValueData = {};
  const months = Object.keys(data.months);

  guidanceOptions.forEach((guidance) => {
    const guidanceField = guidance.value;

    if (typeof guidanceField === "string" && !guidance.calculation) {
      if (data[`${guidanceField}_months`]) {
        sidebarGuidanceData[guidanceField] = months.map(
          (month) => data[`${guidanceField}_months`]?.[month]?.value || 0
        );
      } else {
        const totalGuidanceValue = data[guidanceField];
        if (totalGuidanceValue !== undefined) {
          const totalValue = Number(totalGuidanceValue) || 0;
          const equalShare = Math.round((totalValue / months.length) * 10) / 10;
          sidebarGuidanceData[guidanceField] = Array(months.length).fill(
            equalShare
          );
        }
      }
    }
  });

  return sidebarGuidanceData;
};

export const calculateRowGuidanceMonthlyData = (
  rowData: ExtendedForecastData,
  guidance: Guidance
): { [month: string]: number } | null => {
  const totalVolumeTY = rowData.case_equivalent_volume || 0;
  const totalVolumePY = rowData.py_case_equivalent_volume || 0;
  const totalGsvTY = rowData.gross_sales_value || 0;
  const totalGsvPY = rowData.py_gross_sales_value || 0;

  const tyRate = totalVolumeTY === 0 ? 0 : totalGsvTY / totalVolumeTY;
  const pyRate = totalVolumePY === 0 ? 0 : totalGsvPY / totalVolumePY;

  if (typeof guidance.value === "string") {
    const fieldName = guidance.value;
    const currentMonths = rowData.months;
    const pyMonths = rowData.py_case_equivalent_volume_months;
    const lcMonths = rowData.prev_published_case_equivalent_volume_months;
    const resultMonthlyData: { [month: string]: number } = {};

    MONTH_NAMES.forEach((month: string) => {
      let value: number | undefined;
      if (fieldName === "case_equivalent_volume") {
        value = currentMonths[month]?.value;
      } else if (fieldName === "py_case_equivalent_volume") {
        value = pyMonths?.[month]?.value;
      } else if (fieldName === "prev_published_case_equivalent_volume") {
        value = lcMonths?.[month]?.value;
      } else if (fieldName === "gross_sales_value") {
        const monthVolumeTY = currentMonths[month]?.value || 0;
        value = monthVolumeTY * tyRate;
      } else if (fieldName === "py_gross_sales_value") {
        const monthVolumePY = pyMonths?.[month]?.value || 0;
        value = monthVolumePY * pyRate;
      } else if (fieldName === "lc_gross_sales_value") {
        if (rowData.lc_gross_sales_value_months?.[month]?.value !== undefined) {
          value = rowData.lc_gross_sales_value_months[month].value;
        } else {
          const monthVolumeLC = lcMonths?.[month]?.value || 0;
          value = monthVolumeLC * tyRate;
        }
      } else {
        const totalValue = Number(rowData[fieldName]) || 0;
        value = totalValue / 12;
      }
      resultMonthlyData[month] = value !== undefined ? value : 0;
    });

    return resultMonthlyData;
  }

  const currentMonths = rowData.months;

  const getMonthlyValue = (fieldName: string, month: string): number => {
    const monthlyDataSource = `${fieldName}_months`;
    if (
      (monthlyDataSource === "prev_published_case_equivalent_volume_months" &&
        rowData.prev_published_case_equivalent_volume_months?.[month]) ||
      (monthlyDataSource === "lc_gross_sales_value_months" &&
        rowData.lc_gross_sales_value_months?.[month]) ||
      (rowData[monthlyDataSource] &&
        typeof rowData[monthlyDataSource] === "object" &&
        rowData[monthlyDataSource][month])
    ) {
      const source =
        monthlyDataSource === "prev_published_case_equivalent_volume_months"
          ? rowData.prev_published_case_equivalent_volume_months
          : rowData[monthlyDataSource];
      const value = source[month]?.value || 0;
      return value;
    } else {
      let calculatedValue = 0;
      if (fieldName === "gross_sales_value") {
        const monthVolumeTY = currentMonths[month]?.value || 0;
        calculatedValue = monthVolumeTY * tyRate;
      } else if (fieldName === "py_gross_sales_value") {
        const monthVolumePY =
          rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
        calculatedValue = monthVolumePY * pyRate;
      } else if (fieldName === "py_case_equivalent_volume") {
        calculatedValue =
          rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
      } else if (fieldName === "prev_published_case_equivalent_volume") {
        calculatedValue =
          rowData.prev_published_case_equivalent_volume_months?.[month]
            ?.value || 0;
      } else if (fieldName === "lc_gross_sales_value") {
        if (rowData.lc_gross_sales_value_months?.[month]?.value !== undefined) {
          calculatedValue = rowData.lc_gross_sales_value_months[month].value;
        } else {
          const monthVolumeLC =
            rowData.prev_published_case_equivalent_volume_months?.[month]
              ?.value || 0;
          calculatedValue = monthVolumeLC * tyRate;
        }
      } else if (fieldName === "case_equivalent_volume") {
        calculatedValue = currentMonths[month]?.value || 0;
      } else {
        calculatedValue = 0;
      }
      return calculatedValue;
    }
  };

  const resultMonthlyData: { [month: string]: number } = {};

  if (
    guidance.calculation.type === "difference" &&
    guidance.value !== null &&
    typeof guidance.value === "object" &&
    "expression" in guidance.value
  ) {
    const expressionParts = guidance.value.expression.split(" - ");
    const field1 = expressionParts[0].trim();
    const field2 = expressionParts[1].trim();

    MONTH_NAMES.forEach((month) => {
      const value1 = getMonthlyValue(field1, month);
      const value2 = getMonthlyValue(field2, month);
      resultMonthlyData[month] = value1 - value2;
    });
    return resultMonthlyData;
  } else if (
    guidance.calculation.type === "percentage" &&
    guidance.value !== null &&
    typeof guidance.value === "object" &&
    "numerator" in guidance.value &&
    "denominator" in guidance.value
  ) {
    const numeratorParts = guidance.value.numerator.split(" - ");
    const numerField1 = numeratorParts[0].trim();
    const numerField2 = numeratorParts[1].trim();
    const denomField = guidance.value.denominator.trim();

    MONTH_NAMES.forEach((month) => {
      const numerValue1 = getMonthlyValue(numerField1, month);
      const numerValue2 = getMonthlyValue(numerField2, month);
      const denomValue = getMonthlyValue(denomField, month);

      const numerator = numerValue1 - numerValue2;
      resultMonthlyData[month] = denomValue === 0 ? 0 : numerator / denomValue;
    });
    return resultMonthlyData;
  }

  return null;
};

export interface CalculatedGuidanceValue {
  total?: number;
  monthly?: { [month: string]: number };
}

export const calculateSingleSummaryGuidance = (
  baseData: {
    total_ty: number;
    total_py: number;
    total_gsv_ty: number;
    total_gsv_py: number;
    input_months_ty?: { [key: string]: number };
    input_months_py?: { [key: string]: number };
    total_lc_volume: number;
    total_lc_gsv: number;
    input_months_lc_volume?: { [key: string]: number };
    input_months_lc_gsv?: { [key: string]: number };
  },
  guidance: Guidance,
  calculateMonthly: boolean = false
): CalculatedGuidanceValue => {
  const result: CalculatedGuidanceValue = {};

  const totalVolumeTY = baseData.total_ty || 0;
  const totalVolumePY = baseData.total_py || 0;
  const totalGsvTY = baseData.total_gsv_ty || 0;
  const totalGsvPY = baseData.total_gsv_py || 0;

  const tyRate = totalVolumeTY === 0 ? 0 : totalGsvTY / totalVolumeTY;
  const pyRate = totalVolumePY === 0 ? 0 : totalGsvPY / totalVolumePY;

  const getTotalValue = (fieldName: string): number => {
    if (fieldName === "case_equivalent_volume") return totalVolumeTY;
    if (fieldName === "py_case_equivalent_volume") return totalVolumePY;
    if (fieldName === "gross_sales_value") return totalGsvTY;
    if (fieldName === "py_gross_sales_value") return totalGsvPY;
    if (fieldName === "gsv_rate") return tyRate;
    if (fieldName === "py_gsv_rate") return pyRate;
    if (fieldName === "prev_published_case_equivalent_volume")
      return baseData.total_lc_volume;
    if (fieldName === "lc_gross_sales_value") return baseData.total_lc_gsv;

    return 0;
  };

  if (typeof guidance.value === "string") {
    result.total = getTotalValue(guidance.value);
  } else {
    const calcType = guidance.calculation.type;
    if (
      calcType === "difference" &&
      guidance.value !== null &&
      typeof guidance.value === "object" &&
      "expression" in guidance.value
    ) {
      const parts = guidance.value.expression.split(" - ");
      result.total =
        getTotalValue(parts[0]?.trim()) - getTotalValue(parts[1]?.trim());
    } else if (
      calcType === "percentage" &&
      guidance.value !== null &&
      typeof guidance.value === "object" &&
      "numerator" in guidance.value &&
      "denominator" in guidance.value
    ) {
      const numParts = guidance.value.numerator.split(" - ");
      const numerator =
        getTotalValue(numParts[0]?.trim()) - getTotalValue(numParts[1]?.trim());
      const denominator = getTotalValue(guidance.value.denominator.trim());
      result.total = denominator === 0 ? 0 : numerator / denominator;
    }
  }
  result.total = result.total ? Math.round(result.total * 1000) / 1000 : 0;

  if (calculateMonthly && baseData.input_months_ty) {
    result.monthly = {};
    MONTH_NAMES.forEach((month) => {
      let monthlyVal: number | undefined = undefined;

      const getMonthlyValue = (
        fieldName: string,
        currentMonth: string
      ): number => {
        if (fieldName === "case_equivalent_volume")
          return baseData.input_months_ty?.[currentMonth] ?? 0;
        if (fieldName === "py_case_equivalent_volume")
          return baseData.input_months_py?.[currentMonth] ?? 0;
        if (fieldName === "gross_sales_value")
          return (baseData.input_months_ty?.[currentMonth] ?? 0) * tyRate;
        if (fieldName === "py_gross_sales_value")
          return (baseData.input_months_py?.[currentMonth] ?? 0) * pyRate;
        if (fieldName === "gsv_rate") return tyRate;
        if (fieldName === "py_gsv_rate") return pyRate;
        if (fieldName === "prev_published_case_equivalent_volume")
          return baseData.input_months_lc_volume?.[currentMonth] ?? 0;
        if (fieldName === "lc_gross_sales_value") {
          if (baseData.input_months_lc_gsv?.[currentMonth] !== undefined) {
            return baseData.input_months_lc_gsv[currentMonth];
          }
          return (
            (baseData.input_months_lc_volume?.[currentMonth] ?? 0) * tyRate
          );
        }

        return 0;
      };

      if (typeof guidance.value === "string") {
        monthlyVal = getMonthlyValue(guidance.value, month);
      } else {
        const calcType = guidance.calculation.type;
        if (
          calcType === "difference" &&
          guidance.value !== null &&
          typeof guidance.value === "object" &&
          "expression" in guidance.value
        ) {
          const parts = guidance.value.expression.split(" - ");
          const val1 = getMonthlyValue(parts[0]?.trim(), month);
          const val2 = getMonthlyValue(parts[1]?.trim(), month);
          monthlyVal = val1 - val2;
        } else if (
          calcType === "percentage" &&
          guidance.value !== null &&
          typeof guidance.value === "object" &&
          "numerator" in guidance.value &&
          "denominator" in guidance.value
        ) {
          const numParts = guidance.value.numerator.split(" - ");
          const numerVal1 = getMonthlyValue(numParts[0]?.trim(), month);
          const numerVal2 = getMonthlyValue(numParts[1]?.trim(), month);
          const denomVal = getMonthlyValue(
            guidance.value.denominator.trim(),
            month
          );
          const numerator = numerVal1 - numerVal2;
          monthlyVal = denomVal === 0 ? 0 : numerator / denomVal;
        }
      }
      result.monthly![month] =
        monthlyVal !== undefined ? Math.round(monthlyVal * 1000) / 1000 : 0;
    });
  }

  return result;
};

export type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from "../summary/summary";

interface AggregationResult {
  variantsAggArray: SummaryVariantAggregateData[];
  brandAggsMap: Map<string, SummaryBrandAggregateData>;
  maxActualIndex: number;
}

function roundToWhole(num: number | null | undefined): number {
  return Math.round(num || 0);
}

interface MarketLevelBucket {
  market_id: string;
  market_name?: string;
  brand?: string;
  variant?: string;
  variant_id?: string;
  variant_size_pack_desc: string;
  month: number;
  case_equivalent_volume: number;
  py_case_equivalent_volume: number;
  prev_published_case_equivalent_volume: number;
  gross_sales_value: number;
  py_gross_sales_value: number;
  data_type?: string;
  is_manual_input?: boolean;
}

export const aggregateSummaryData = (
  rawVolumeData: RawDepletionForecastItem[],
  customerRawVolumeData: RawDepletionForecastItem[],
  marketData: MarketData[],
  pendingChangesMap: Map<string, RestoredState>
): AggregationResult => {
  let maxActualIndex = -1;
  const marketLevelBuckets: { [key: string]: MarketLevelBucket } = {};

  const customerToMarketMap = new Map<string, string>();
  marketData.forEach((market) => {
    market.customers?.forEach((customer) => {
      customerToMarketMap.set(customer.customer_id, market.market_id);
    });
  });

  marketData.forEach((market) => {
    const marketId = market.market_id;
    const marketName = market.market_name;
    const managedBy = market.settings?.managed_by;

    if (managedBy === "Market") {
      rawVolumeData
        .filter((item) => item.market_id === marketId)
        .forEach((item) => {
          if (!item.variant_size_pack_desc || !item.month) return;
          const key = `${marketId}_${item.variant_size_pack_desc}_${item.month}`;
          if (!marketLevelBuckets[key]) {
            marketLevelBuckets[key] = {
              market_id: marketId,
              market_name: marketName,
              brand: item.brand,
              variant: item.variant,
              variant_id: item.variant_id,
              variant_size_pack_desc: item.variant_size_pack_desc,
              month: item.month,
              case_equivalent_volume: 0,
              py_case_equivalent_volume: 0,
              prev_published_case_equivalent_volume: 0,
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type,
              is_manual_input: item.is_manual_input,
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].prev_published_case_equivalent_volume +=
            Number(item.prev_published_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;

          if (item.data_type?.includes("actual")) {
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    } else if (managedBy === "Customer") {
      customerRawVolumeData
        .filter(
          (item) => customerToMarketMap.get(item.customer_id || "") === marketId
        )
        .forEach((item) => {
          if (!item.variant_size_pack_desc || !item.month) return;
          const key = `${marketId}_${item.variant_size_pack_desc}_${item.month}`;
          if (!marketLevelBuckets[key]) {
            marketLevelBuckets[key] = {
              market_id: marketId,
              market_name: marketName,
              brand: item.brand,
              variant: item.variant,
              variant_id: item.variant_id,
              variant_size_pack_desc: item.variant_size_pack_desc,
              month: item.month,
              case_equivalent_volume: 0,
              py_case_equivalent_volume: 0,
              prev_published_case_equivalent_volume: 0,
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type,
              is_manual_input: item.is_manual_input,
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].prev_published_case_equivalent_volume +=
            Number(item.prev_published_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;
          if (item.data_type?.includes("actual")) {
            marketLevelBuckets[key].data_type = "actual_complete";
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    }
  });

  pendingChangesMap.forEach((change, redisKey) => {
    const parts = redisKey.split(":");
    if (parts.length < 3) return;

    let marketId: string | undefined;
    let variantDesc = parts[2];
    const potentialId = parts[1];

    if (parts.length === 4 && parts[3] === potentialId) {
      marketId = customerToMarketMap.get(potentialId);
    } else if (!customerToMarketMap.has(potentialId)) {
      if (marketData.some((m) => m.market_id === potentialId)) {
        marketId = potentialId;
      }
    }

    if (!marketId) {
      return;
    }

    Object.entries(change.months).forEach(([monthName, monthData]) => {
      const typedMonthName = monthName as (typeof MONTH_NAMES)[number];
      const monthNum = MONTH_NAMES.indexOf(typedMonthName) + 1;
      if (monthNum > 0) {
        const bucketKey = `${marketId}_${variantDesc}_${monthNum}`;
        if (marketLevelBuckets[bucketKey]) {
          marketLevelBuckets[bucketKey].case_equivalent_volume =
            monthData.value;
          marketLevelBuckets[bucketKey].prev_published_case_equivalent_volume =
            monthData.value;
          marketLevelBuckets[bucketKey].is_manual_input =
            monthData.isManuallyModified ?? change.isManualEdit;
          if (monthNum - 1 > maxActualIndex) {
            marketLevelBuckets[bucketKey].data_type = "forecast";
          }
        } else {
        }
      }
    });
  });

  const variantAggregation: {
    [variantKey: string]: SummaryVariantAggregateData;
  } = {};

  Object.values(marketLevelBuckets).forEach((bucket) => {
    const brand = bucket.brand;
    const variantName = bucket.variant;
    const variantId = bucket.variant_id;
    if (
      !brand ||
      !variantName ||
      !bucket.market_id ||
      !bucket.variant_size_pack_desc
    )
      return;

    const variantKey = variantId
      ? `${brand}_${variantId}`
      : `${brand}_${variantName}`;
    const monthIndex = bucket.month;
    if (monthIndex < 1 || monthIndex > 12) return;
    const monthName = MONTH_NAMES[monthIndex - 1];

    const volume = bucket.case_equivalent_volume;
    const py_volume = bucket.py_case_equivalent_volume;
    const gsv_ty_from_bucket = bucket.gross_sales_value;
    const gsv_py_from_bucket = bucket.py_gross_sales_value;

    if (!variantAggregation[variantKey]) {
      variantAggregation[variantKey] = {
        id: variantKey,
        brand: brand,
        variant_id: variantId,
        variant: variantName,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      };
    }

    variantAggregation[variantKey].months[monthName] += volume;
    variantAggregation[variantKey].months_py_volume[monthName] += py_volume;
    variantAggregation[variantKey].total_gsv_ty += gsv_ty_from_bucket;
    variantAggregation[variantKey].total_gsv_py += gsv_py_from_bucket;

    const lc_volume = bucket.prev_published_case_equivalent_volume || 0;
    variantAggregation[variantKey].months_lc_volume[monthName] =
      (variantAggregation[variantKey].months_lc_volume[monthName] || 0) +
      lc_volume;
  });

  let variantsAggArray = Object.values(variantAggregation)
    .map((variantAggRow) => {
      variantAggRow.total = Object.values(variantAggRow.months).reduce(
        (s: number, v: number) => s + v,
        0
      );
      variantAggRow.total_py_volume = Object.values(
        variantAggRow.months_py_volume
      ).reduce((s: number, v: number) => s + v, 0);

      variantAggRow.total = roundToWhole(variantAggRow.total);
      variantAggRow.total_py_volume = roundToWhole(
        variantAggRow.total_py_volume
      );
      variantAggRow.prev_published_case_equivalent_volume = roundToWhole(
        Object.values(variantAggRow.months_lc_volume).reduce(
          (s: number, v: number) => s + v,
          0
        )
      );

      variantAggRow.total_gsv_ty = roundToWhole(variantAggRow.total_gsv_ty);
      variantAggRow.total_gsv_py = roundToWhole(variantAggRow.total_gsv_py);

      MONTH_NAMES.forEach((m) => {
        variantAggRow.months[m] = roundToWhole(variantAggRow.months[m]);
        variantAggRow.months_py_volume[m] = roundToWhole(
          variantAggRow.months_py_volume[m]
        );
        variantAggRow.months_lc_volume[m] = roundToWhole(
          variantAggRow.months_lc_volume[m] || 0
        );
      });

      const variantGsvRate =
        variantAggRow.total > 0
          ? variantAggRow.total_gsv_ty / variantAggRow.total
          : 0;
      variantAggRow.gsv_rate = variantGsvRate;

      variantAggRow.lc_gross_sales_value = roundToWhole(
        variantAggRow.prev_published_case_equivalent_volume * variantGsvRate
      );

      variantAggRow.months_lc_gsv = {};

      MONTH_NAMES.forEach((m) => {
        variantAggRow.months_lc_gsv![m] = roundToWhole(
          (variantAggRow.months_lc_volume[m] || 0) * variantGsvRate
        );
      });

      return variantAggRow;
    })
    .filter((row) => Math.abs(row.total) > 0.001);

  const brandAggsMap = new Map<string, SummaryBrandAggregateData>();
  variantsAggArray.forEach((variantRow) => {
    const brandKey = variantRow.brand;
    if (!brandAggsMap.has(brandKey)) {
      brandAggsMap.set(brandKey, {
        id: brandKey,
        brand: brandKey,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        months_py_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
        prev_published_case_equivalent_volume: 0,
        months_lc_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        lc_gross_sales_value: 0,
        months_lc_gsv: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
      });
    }
    const brandAgg = brandAggsMap.get(brandKey)!;
    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] += variantRow.months[m];
      brandAgg.months_py_volume[m] += variantRow.months_py_volume[m];
      brandAgg.total += variantRow.total;
      brandAgg.total_py_volume += variantRow.total_py_volume;
      brandAgg.total_gsv_ty += variantRow.total_gsv_ty;
      brandAgg.total_gsv_py += variantRow.total_gsv_py;
      brandAgg.prev_published_case_equivalent_volume +=
        variantRow.prev_published_case_equivalent_volume;
      brandAgg.lc_gross_sales_value += variantRow.lc_gross_sales_value;
      brandAgg.months_lc_volume[m] =
        (brandAgg.months_lc_volume[m] || 0) +
        (variantRow.months_lc_volume[m] || 0);
      if (variantRow.months_lc_gsv && brandAgg.months_lc_gsv) {
        brandAgg.months_lc_gsv[m] =
          (brandAgg.months_lc_gsv[m] || 0) + (variantRow.months_lc_gsv[m] || 0);
      }
    });
  });

  brandAggsMap.forEach((brandAgg) => {
    brandAgg.total = roundToWhole(brandAgg.total);
    brandAgg.total_py_volume = roundToWhole(brandAgg.total_py_volume);
    brandAgg.total_gsv_ty = roundToWhole(brandAgg.total_gsv_ty);
    brandAgg.total_gsv_py = roundToWhole(brandAgg.total_gsv_py);
    brandAgg.prev_published_case_equivalent_volume = roundToWhole(
      brandAgg.prev_published_case_equivalent_volume
    );
    brandAgg.lc_gross_sales_value = roundToWhole(brandAgg.lc_gross_sales_value);

    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] = roundToWhole(brandAgg.months[m]);
      brandAgg.months_py_volume[m] = roundToWhole(brandAgg.months_py_volume[m]);
      brandAgg.months_lc_volume[m] = roundToWhole(
        brandAgg.months_lc_volume[m] || 0
      );
      if (brandAgg.months_lc_gsv) {
        brandAgg.months_lc_gsv[m] = roundToWhole(
          brandAgg.months_lc_gsv[m] || 0
        );
      }
    });
  });

  return {
    variantsAggArray,
    brandAggsMap,
    maxActualIndex,
  };
};

export const calculateAllSummaryGuidance = (
  variantsAggArray: SummaryVariantAggregateData[],
  brandAggsMap: Map<string, SummaryBrandAggregateData>,
  selectedGuidance: Guidance[],
  selectedRowGuidance: Guidance[]
): SummaryCalculationsState => {
  const calculatedResults: SummaryCalculationsState = {};
  const allGuidanceDefs = [...selectedGuidance, ...selectedRowGuidance];
  const uniqueGuidanceDefs = Array.from(
    new Map(allGuidanceDefs.map((g) => [g.id, g])).values()
  );
  const rowGuidanceIds = new Set(selectedRowGuidance.map((g) => g.id));

  variantsAggArray.forEach((variantAgg) => {
    const key = `variant:${variantAgg.brand}_${
      variantAgg.variant_id || variantAgg.variant
    }`;
    calculatedResults[key] = {};
    const baseData = {
      total_ty: variantAgg.total,
      total_py: variantAgg.total_py_volume,
      total_gsv_ty: variantAgg.total_gsv_ty,
      total_gsv_py: variantAgg.total_gsv_py,
      input_months_ty: variantAgg.months,
      input_months_py: variantAgg.months_py_volume,
      total_lc_volume: variantAgg.prev_published_case_equivalent_volume,
      total_lc_gsv: variantAgg.lc_gross_sales_value,
      input_months_lc_volume: variantAgg.months_lc_volume,
      input_months_lc_gsv: variantAgg.months_lc_gsv,
    };
    uniqueGuidanceDefs.forEach((guidanceDef) => {
      const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
      calculatedResults[key][guidanceDef.id] = calculateSingleSummaryGuidance(
        baseData,
        guidanceDef,
        needsMonthly
      );
    });
  });

  brandAggsMap.forEach((brandAgg) => {
    const key = `brand:${brandAgg.id}`;
    calculatedResults[key] = {};
    const baseData = {
      total_ty: brandAgg.total,
      total_py: brandAgg.total_py_volume,
      total_gsv_ty: brandAgg.total_gsv_ty,
      total_gsv_py: brandAgg.total_gsv_py,
      input_months_ty: brandAgg.months,
      input_months_py: brandAgg.months_py_volume,
      total_lc_volume: brandAgg.prev_published_case_equivalent_volume,
      total_lc_gsv: brandAgg.lc_gross_sales_value,
      input_months_lc_volume: brandAgg.months_lc_volume,
      input_months_lc_gsv: brandAgg.months_lc_gsv,
    };
    uniqueGuidanceDefs.forEach((guidanceDef) => {
      const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
      calculatedResults[key][guidanceDef.id] = calculateSingleSummaryGuidance(
        baseData,
        guidanceDef,
        needsMonthly
      );
    });
  });

  return calculatedResults;
};

export const calculateTotalGuidance = (
  brandAggsMap: Map<string, SummaryBrandAggregateData>,
  selectedGuidance: Guidance[],
  selectedRowGuidance: Guidance[]
): { [key: string]: CalculatedGuidanceValue } => {
  const totalResults: { [key: string]: CalculatedGuidanceValue } = {};
  const allGuidanceDefs = [...selectedGuidance, ...selectedRowGuidance];
  const uniqueGuidanceDefs = Array.from(
    new Map(allGuidanceDefs.map((g) => [g.id, g])).values()
  );
  const rowGuidanceIds = new Set(selectedRowGuidance.map((g) => g.id));

  const totalMonths_ty: { [key: string]: number } = {};
  const totalMonths_py: { [key: string]: number } = {};
  const totalMonths_gsv_ty: { [key: string]: number } = {};
  const totalMonths_gsv_py: { [key: string]: number } = {};
  let total_ty = 0;
  let total_py = 0;
  let total_gsv_ty = 0;
  let total_gsv_py = 0;

  brandAggsMap.forEach((brandAgg) => {
    total_ty += brandAgg.total;
    total_py += brandAgg.total_py_volume;
    total_gsv_ty += brandAgg.total_gsv_ty;
    total_gsv_py += brandAgg.total_gsv_py;

    MONTH_NAMES.forEach((month) => {
      totalMonths_ty[month] =
        (totalMonths_ty[month] || 0) + (brandAgg.months?.[month] || 0);
      totalMonths_py[month] =
        (totalMonths_py[month] || 0) +
        (brandAgg.months_py_volume?.[month] || 0);
      totalMonths_gsv_ty[month] =
        (totalMonths_gsv_ty[month] || 0) +
        (brandAgg.months_gsv_ty?.[month] || 0);
      totalMonths_gsv_py[month] =
        (totalMonths_gsv_py[month] || 0) +
        (brandAgg.months_gsv_py?.[month] || 0);
    });
  });

  total_ty = Math.round(total_ty);
  total_py = Math.round(total_py);
  total_gsv_ty = Math.round(total_gsv_ty * 100) / 100;
  total_gsv_py = Math.round(total_gsv_py * 100) / 100;

  MONTH_NAMES.forEach((month) => {
    totalMonths_ty[month] = Math.round(totalMonths_ty[month]);
    totalMonths_py[month] = Math.round(totalMonths_py[month]);
    totalMonths_gsv_ty[month] =
      Math.round(totalMonths_gsv_ty[month] * 100) / 100;
    totalMonths_gsv_py[month] =
      Math.round(totalMonths_gsv_py[month] * 100) / 100;
  });

  const baseData = {
    total_ty,
    total_py,
    total_gsv_ty,
    total_gsv_py,
    input_months_ty: totalMonths_ty,
    input_months_py: totalMonths_py,
    total_lc_volume: Math.round(
      Array.from(brandAggsMap.values()).reduce(
        (sum, brand) => sum + brand.prev_published_case_equivalent_volume,
        0
      )
    ),
    total_lc_gsv: Math.round(
      Array.from(brandAggsMap.values()).reduce(
        (sum, brand) => sum + brand.lc_gross_sales_value,
        0
      )
    ),
    input_months_lc_volume: MONTH_NAMES.reduce((acc, month) => {
      acc[month] = Math.round(
        Array.from(brandAggsMap.values()).reduce(
          (sum, brand) => sum + (brand.months_lc_volume?.[month] || 0),
          0
        )
      );
      return acc;
    }, {} as { [key: string]: number }),
    input_months_lc_gsv: MONTH_NAMES.reduce((acc, month) => {
      acc[month] = Math.round(
        Array.from(brandAggsMap.values()).reduce(
          (sum, brand) => sum + (brand.months_lc_gsv?.[month] || 0),
          0
        )
      );
      return acc;
    }, {} as { [key: string]: number }),
  };

  uniqueGuidanceDefs.forEach((guidanceDef) => {
    const needsMonthly = rowGuidanceIds.has(guidanceDef.id);
    totalResults[guidanceDef.id] = calculateSingleSummaryGuidance(
      baseData,
      guidanceDef,
      needsMonthly
    );
  });

  return totalResults;
};
