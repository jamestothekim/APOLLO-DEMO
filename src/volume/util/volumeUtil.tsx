import { ExtendedForecastData } from "../depletions/depletions";
import { Box } from "@mui/material";
import type { GuidanceForecastOption } from "../../reusableComponents/quantSidebar";
import type { RawDepletionForecastItem } from "../../redux/depletionSlice";
import type { RestoredState } from "../../redux/pendingChangesSlice";
import type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from "../summary/summary"; // Import exported types
import type { SummaryCalculationsState } from "../../redux/guidanceCalculationsSlice";
import { MarketData } from "../volumeForecast"; // Import MarketData

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

// Renamed to make it clear this is for sidebar
export const SIDEBAR_GUIDANCE_OPTIONS = [
  {
    id: 1,
    label: "Last Year (LY)",
    value: "py_case_equivalent_volume",
    color: "#c7b8ea", // Lavender
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

  // First identify all actual months from the data
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

  // Find the last actual month index
  const lastActualMonthIndex =
    hasAnyActuals && actualMonths.size > 0
      ? Math.max(...Array.from(actualMonths).map((m) => MONTH_NAMES.indexOf(m)))
      : -1;

  // Initialize all months
  MONTH_NAMES.forEach((month, index) => {
    // If we have any actuals, all months up to the last actual month should be marked as actual
    const shouldBeActual = hasAnyActuals && index <= lastActualMonthIndex;

    months[month] = {
      value: 0,
      isActual: shouldBeActual,
      isManuallyModified: false,
      data_type: shouldBeActual ? "actual_complete" : "forecast", // Add data_type for phantom records
    };
  });

  // Fill in actual values from data
  data.forEach((item) => {
    if (item?.month && item.case_equivalent_volume !== undefined) {
      const monthName = MONTH_NAMES[item.month - 1];
      if (!monthName) {
        console.warn("Invalid month index:", item.month);
        return;
      }

      const value = Math.round(Number(item.case_equivalent_volume) * 10) / 10;
      months[monthName] = {
        value: isNaN(value) ? 0 : value,
        isActual: Boolean(item.data_type?.includes("actual")),
        isManuallyModified: Boolean(item.is_manual_input),
        data_type:
          item.data_type ||
          (months[monthName].isActual ? "actual_complete" : "forecast"), // Preserve or set data_type
      };
    }
  });

  return months;
};

// Add this type to handle both data structures
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
  [key: string]: any; // Allow for guidance fields
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
    // --- Summary View Specific Export Logic ---
    baseHeaders = ["BRAND / VARIANT", "VOL 9L (TY)", "VOL 9L (LY)"]; // No Market, No Logic

    // Add guidance headers
    const guidanceHeaders =
      selectedGuidance?.map((guidance) =>
        guidance.sublabel
          ? `${guidance.label} (${guidance.sublabel})`
          : guidance.label
      ) || [];

    // Add month headers with ACT/FCST labels based on lastActualMonthIndex
    const monthHeaders = monthKeys.map((month, index) => {
      const label = index <= lastActualMonthIndex ? "(ACT)" : "(FCST)";
      return `${month} ${label}`;
    });

    // Combine all headers for CSV
    const headerRow = [...baseHeaders, ...guidanceHeaders, ...monthHeaders];

    // Format each data row for Summary View
    dataRows = data.map((item) => {
      // BRAND / VARIANT column
      const brandVariant = item.isBrandRow ? item.brand : item.variant || ""; // Use brand for brand rows, variant otherwise

      // Format the total volume with 1 decimal place
      const totalVolumeTY = item.case_equivalent_volume ?? 0;
      const formattedTotalTY = totalVolumeTY.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      // Format the total PY volume with 1 decimal place
      const totalVolumeLY = item.py_case_equivalent_volume ?? 0;
      const formattedTotalLY = totalVolumeLY.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      // Base columns for Summary
      const baseColumns = [brandVariant, formattedTotalTY, formattedTotalLY];

      // Format guidance values (same logic as before, ensure item has the data)
      const guidanceColumns =
        selectedGuidance?.map((guidance) => {
          // Derive the key for the guidance value. This might need adjustment
          // depending on how guidance results are attached to the 'item' in Summary export.
          // Assuming the `guidanceResults` are merged into the item for export.
          const valueKey = `guidance_${guidance.id}`;
          const value = item[valueKey]; // Access pre-calculated guidance value

          if (value === undefined || isNaN(value)) return "";

          // Apply formatting
          if (guidance.calculation.format === "percent") {
            return `${Math.round(value * 100)}%`;
          } else if (
            guidance.label.toLowerCase().includes("gsv") &&
            !guidance.label.toLowerCase().includes("%")
          ) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0, // No decimals for GSV
              maximumFractionDigits: 0, // No decimals for GSV
            }).format(value);
          } else {
            // Standard number format with 1 decimal place for summary non-currency (Volume)
            return value.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
          }
        }) || [];

      // Format month values with 1 decimal place (whole numbers)
      const monthValues = monthKeys.map((month) => {
        const value = item.months[month]?.value || 0;
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      });

      // Combine all columns for this row
      return [...baseColumns, ...guidanceColumns, ...monthValues];
    });

    // --- Generate CSV for Summary View ---
    const processedRows = dataRows.map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell ?? ""); // Handle potential undefined values
          if (stringCell.includes(",") || stringCell.includes('"')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        })
        .join(",")
    );
    const csvContent = [headerRow.join(","), ...processedRows].join("\n");

    // --- Trigger Download ---
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "summary_forecast_data.csv"); // Changed filename
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // --- Existing Export Logic (Depletions/Customer) ---
    baseHeaders = [
      "Market",
      ...(data.some((row) => row.customer_name) ? ["Customer"] : []),
      "Product",
      "Forecast Logic",
      "VOL 9L (TY)",
    ];

    // Add guidance headers
    const guidanceHeaders =
      selectedGuidance?.map((guidance) =>
        guidance.sublabel
          ? `${guidance.label} (${guidance.sublabel})`
          : guidance.label
      ) || [];

    // Add month headers with ACT/FCST labels
    const monthHeaders = monthKeys.map((month) => {
      const firstRow = data[0];
      // Use lastActualMonthIndex if available, otherwise fallback to checking first row
      const isActual =
        lastActualMonthIndex !== -1
          ? MONTH_NAMES.indexOf(month) <= lastActualMonthIndex
          : firstRow?.months[month]?.isActual;
      return `${month} ${isActual ? "(ACT)" : "(FCST)"}`;
    });

    // Combine all headers for CSV
    const headerRow = [
      ...baseHeaders,
      ...guidanceHeaders,
      ...monthHeaders,
      "Commentary",
    ];

    // Format each data row with proper formatting
    dataRows = data.map((item) => {
      // Format the total volume with 1 decimal place
      const totalVolume = calculateTotal(item.months);
      const formattedTotal = totalVolume.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      // Base columns
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

      // Format guidance values
      const guidanceColumns =
        selectedGuidance?.map((guidance) => {
          // Get guidance value from the row
          const valueKey = `guidance_${guidance.id}`; // Assume calculated guidance is passed in item
          const value =
            typeof guidance.value === "string"
              ? item[guidance.value]
              : item[valueKey];

          if (value === undefined || isNaN(value)) return "";

          // Apply appropriate formatting based on guidance type
          if (guidance.calculation.format === "percent") {
            return `${Math.round(value * 100)}%`;
          } else if (
            guidance.label.toLowerCase().includes("gsv") &&
            !guidance.label.toLowerCase().includes("%")
          ) {
            // Currency format for GSV values
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          } else {
            // Standard number format with 1 decimal place (Volume)
            return value.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
          }
        }) || [];

      // Format month values with 1 decimal place
      const monthValues = monthKeys.map((month) => {
        const value = item.months[month]?.value || 0;
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      });

      // Combine all columns for this row
      return [
        ...baseColumns,
        ...guidanceColumns,
        ...monthValues,
        item.commentary || "",
      ];
    });

    // Convert rows to CSV format, properly handling commas and quotes
    const processedRows = dataRows.map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell ?? ""); // Handle potential undefined values
          // If cell contains comma or quote, wrap in quotes
          if (stringCell.includes(",") || stringCell.includes('"')) {
            // Double up any quotes to escape them
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        })
        .join(",")
    );

    // Create the CSV content and trigger download
    const csvContent = [headerRow.join(","), ...processedRows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "forecast_data.csv"); // Original filename
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
  return total > 0.0001; // Using small epsilon to handle floating point precision
};

export const calculateTotal = (months: {
  [key: string]: {
    value: number;
    isActual?: boolean;
    isManuallyModified?: boolean;
  };
}): number => {
  return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
};

// Add this type to handle guidance data
export interface GuidanceData {
  [key: string]: number;
}

// Add new types for calculation structure
export interface GuidanceCalculation {
  type: "direct" | "percentage" | "difference";
  format?: "number" | "percent";
}

export interface GuidanceValue {
  numerator?: string;
  denominator?: string;
  expression?: string;
}

export interface Guidance {
  id: number;
  label: string;
  sublabel?: string;
  value: string | GuidanceValue;
  calculation: GuidanceCalculation;
}

export const processGuidanceValue = (
  data: any[],
  guidance: Guidance,
  isCustomerView: boolean
): { [key: string]: number } => {
  const guidanceData: { [key: string]: number } = {};
  const aggregatedData: { [key: string]: { [field: string]: number } } = {};

  // First, aggregate the data by market/size-pack
  data.forEach((item) => {
    const key = isCustomerView
      ? `forecast:${item.customer_id}:${item.variant_size_pack_desc}:${item.customer_id}`
      : `forecast:${item.market_id}:${item.variant_size_pack_desc}`;

    if (!aggregatedData[key]) {
      aggregatedData[key] = {
        gross_sales_value: 0,
        py_gross_sales_value: 0,
        case_equivalent_volume: 0,
        py_case_equivalent_volume: 0,
      };
    }

    // Sum up all the values we might need
    aggregatedData[key].gross_sales_value +=
      Number(item.gross_sales_value) || 0;
    aggregatedData[key].py_gross_sales_value +=
      Number(item.py_gross_sales_value) || 0;
    aggregatedData[key].case_equivalent_volume +=
      Number(item.case_equivalent_volume) || 0;
    aggregatedData[key].py_case_equivalent_volume +=
      Number(item.py_case_equivalent_volume) || 0;
  });

  // Then process the aggregated data according to guidance type
  Object.entries(aggregatedData).forEach(([key, values]) => {
    if (typeof guidance.value === "string") {
      // Direct value (like py_case_equivalent_volume)
      const fieldName = guidance.value;
      guidanceData[key] = Math.round(values[fieldName] * 100) / 100;
    } else {
      // Calculated value
      const value = guidance.value as GuidanceValue;

      if (
        guidance.calculation.type === "percentage" &&
        value.numerator &&
        value.denominator
      ) {
        // Handle percentage calculations - parse the expressions
        // For example: "gross_sales_value - py_gross_sales_value" / "py_gross_sales_value"
        const numeratorParts = value.numerator.split(" - ");
        const minuend = values[numeratorParts[0]];
        const subtrahend = values[numeratorParts[1]];
        const numeratorValue = minuend - subtrahend;

        const denominatorValue = values[value.denominator];
        guidanceData[key] =
          denominatorValue === 0 ? 0 : numeratorValue / denominatorValue;
      } else if (
        guidance.calculation.type === "difference" &&
        value.expression
      ) {
        // Handle difference calculations
        // For example: "gross_sales_value - py_gross_sales_value"
        const expressionParts = value.expression.split(" - ");
        const minuend = values[expressionParts[0]];
        const subtrahend = values[expressionParts[1]];
        guidanceData[key] = minuend - subtrahend;
      } else {
        guidanceData[key] = 0;
      }
    }
  });

  return guidanceData;
};

// Add this new centralized function to recalculate guidance values
export const recalculateGuidance = (
  row: any,
  selectedGuidance: Guidance[]
): any => {
  if (!selectedGuidance || selectedGuidance.length === 0) {
    return row;
  }

  // Make a copy of the row to avoid mutating the original
  const updatedRow = { ...row };

  // First, ensure we have the total volume (TY) calculated
  const totalVolume = calculateTotal(updatedRow.months);
  updatedRow.case_equivalent_volume = totalVolume;

  // For GSV, we need to update the gross_sales_value based on the updated forecast
  // For simplicity, we'll use a ratio approach: if volume changes by X%, GSV also changes by X%
  if (updatedRow.py_case_equivalent_volume && updatedRow.py_gross_sales_value) {
    const volumeRatio =
      updatedRow.py_case_equivalent_volume > 0
        ? totalVolume / updatedRow.py_case_equivalent_volume
        : 1;

    // If we have historical GSV, we can estimate current GSV based on volume change ratio
    const estimatedGSV = updatedRow.py_gross_sales_value * volumeRatio;

    // Only update if it's significantly different (more than 0.1%)
    const currentGSV = updatedRow.gross_sales_value || 0;
    if (
      Math.abs((estimatedGSV - currentGSV) / Math.max(currentGSV, 1)) > 0.001
    ) {
      updatedRow.gross_sales_value = estimatedGSV;
    }
  }

  // Ensure GSV values exist
  if (updatedRow.gross_sales_value === undefined) {
    console.warn("Missing gross_sales_value (GSV TY) for row:", updatedRow.id);
    updatedRow.gross_sales_value = 0;
  }

  if (updatedRow.py_gross_sales_value === undefined) {
    console.warn(
      "Missing py_gross_sales_value (GSV LY) for row:",
      updatedRow.id
    );
    updatedRow.py_gross_sales_value = 0;
  }

  // Now recalculate all guidance
  selectedGuidance.forEach((guidance) => {
    if (typeof guidance.value === "string") {
      // Direct values don't need recalculation as they come directly from the source data
      // These include py_case_equivalent_volume, gross_sales_value, py_gross_sales_value, etc.
    } else {
      // For calculated values (difference, percentage)
      if (
        guidance.calculation.type === "difference" &&
        guidance.value.expression
      ) {
        const expressionParts = guidance.value.expression.split(" - ");
        const field1 = expressionParts[0].trim();
        const field2 = expressionParts[1].trim();

        // Get the values for fields, handling special cases
        const value1 =
          field1 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field1];
        const value2 =
          field2 === "case_equivalent_volume"
            ? totalVolume
            : updatedRow[field2];

        // Calculate the difference
        const result = (Number(value1) || 0) - (Number(value2) || 0);
        updatedRow[`guidance_${guidance.id}`] = result;
      } else if (
        guidance.calculation.type === "percentage" &&
        guidance.value.numerator &&
        guidance.value.denominator
      ) {
        // Parse the numerator which is an expression like "field1 - field2"
        const numeratorParts = guidance.value.numerator.split(" - ");
        const numerField1 = numeratorParts[0].trim();
        const numerField2 = numeratorParts[1].trim();

        // Get denominator field
        const denomField = guidance.value.denominator.trim();

        // Get all the values, handling special cases
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

        // Calculate the numerator
        const numerator =
          (Number(numerValue1) || 0) - (Number(numerValue2) || 0);
        const denominator = Number(denomValue) || 0;

        // Calculate the percentage, avoiding division by zero
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

  // Handle percentage format first
  if (format === "percent") {
    // Display percentages as whole numbers
    const formattedValue =
      Math.round(roundedValue * 100).toLocaleString() + "%";

    // Return colored text for negative values
    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {formattedValue}
      </Box>
    ) : (
      formattedValue
    );
  }

  // Handle currency format for GSV direct values and differences (but not percentages)
  if (
    guidanceType &&
    guidanceType.toLowerCase().includes("gsv") &&
    !guidanceType.toLowerCase().includes("%")
  ) {
    const formattedValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0, // No decimals for GSV
      maximumFractionDigits: 0, // No decimals for GSV
    }).format(Math.abs(roundedValue));

    // Add negative sign for accounting format
    const accountingValue = isNegative ? `(${formattedValue})` : formattedValue;

    return isNegative ? (
      <Box component="span" sx={{ color: "error.main" }}>
        {accountingValue}
      </Box>
    ) : (
      accountingValue
    );
  }

  // For other number values (Volume)
  const formattedValue = roundedValue.toLocaleString(undefined, {
    minimumFractionDigits: 1, // Show one decimal place
    maximumFractionDigits: 1, // Show one decimal place
  });

  // Return colored text for negative values
  return isNegative ? (
    <Box component="span" sx={{ color: "error.main" }}>
      {formattedValue}
    </Box>
  ) : (
    formattedValue
  );
};

// More descriptive interface name
export interface GuidanceMonthlyValueData {
  [key: string]: number[];
}

// More descriptive interface name
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

  // Process each guidance option
  guidanceOptions.forEach((guidance) => {
    const guidanceField = guidance.value;

    // For direct values (like py_case_equivalent_volume, gross_sales_value)
    if (typeof guidanceField === "string" && !guidance.calculation) {
      // Check if we have historical monthly data in the data object
      if (data[`${guidanceField}_months`]) {
        // Use the actual historical monthly values
        sidebarGuidanceData[guidanceField] = months.map(
          (month) => data[`${guidanceField}_months`]?.[month]?.value || 0
        );
      } else {
        // Fallback to distributing the total value if monthly data is not available
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
    // For calculated guidance, they will be handled in the QuantSidebar's trendLines calculation
    // This ensures calculated guidance are always derived from the latest forecast data
  });

  return sidebarGuidanceData;
};

// --- Function to calculate monthly data for a single row guidance ---
export const calculateRowGuidanceMonthlyData = (
  rowData: ExtendedForecastData,
  guidance: Guidance // Uses local Guidance type from this file
): { [month: string]: number } | null => {
  // Direct Value (e.g., py_case_equivalent_volume)
  if (typeof guidance.value === "string") {
    const fieldName = guidance.value;
    // Assumes convention like 'py_case_equivalent_volume_months' exists on rowData if applicable
    const monthlyDataSource = `${fieldName}_months`;

    if (
      rowData[monthlyDataSource] &&
      typeof rowData[monthlyDataSource] === "object"
    ) {
      const monthlyData: { [month: string]: number } = {};
      MONTH_NAMES.forEach((month) => {
        monthlyData[month] = rowData[monthlyDataSource][month]?.value || 0;
      });
      return monthlyData;
    } else {
      // Distribute total if monthly source doesn't exist (less accurate)
      console.warn(
        `Monthly data source ${monthlyDataSource} not found for row ${rowData.id}. Distributing total.`
      );
      const totalValue = Number(rowData[fieldName]) || 0;
      const monthlyValue = totalValue / 12;
      const monthlyData: { [month: string]: number } = {};
      MONTH_NAMES.forEach((month) => {
        monthlyData[month] = monthlyValue;
      });
      return monthlyData;
    }
  }

  // Calculated Value (Difference or Percentage)
  const guidanceValue = guidance.value as GuidanceValue; // Use local GuidanceValue type
  const currentMonths = rowData.months;

  // Helper to get monthly values, prioritizing specific monthly fields
  const getMonthlyValue = (fieldName: string, month: string): number => {
    const monthlyDataSource = `${fieldName}_months`;
    if (
      rowData[monthlyDataSource] &&
      typeof rowData[monthlyDataSource] === "object" &&
      rowData[monthlyDataSource][month]
    ) {
      return rowData[monthlyDataSource][month]?.value || 0;
    } else {
      // Fallback calculations for specific fields if monthly breakdown isn't directly available
      if (fieldName === "gross_sales_value") {
        // Estimate monthly TY GSV using LY Rate applied to TY Volume
        const monthVolume = currentMonths[month]?.value || 0;
        const pyTotalVolume = rowData.py_case_equivalent_volume || 1; // Avoid div by zero
        const pyTotalGSV = rowData.py_gross_sales_value || 0;
        const lyRate = pyTotalVolume === 0 ? 0 : pyTotalGSV / pyTotalVolume;
        return monthVolume * lyRate; // Apply LY rate to TY monthly volume
      }
      if (fieldName === "py_gross_sales_value") {
        // Estimate monthly PY GSV: Prioritize specific monthly PY GSV if available, else use LY Rate applied to PY Volume
        const pyMonthlyDataSource = "py_gross_sales_value_months";
        if (
          rowData[pyMonthlyDataSource] &&
          typeof rowData[pyMonthlyDataSource] === "object" &&
          rowData[pyMonthlyDataSource][month]
        ) {
          return rowData[pyMonthlyDataSource][month]?.value || 0;
        }
        // Fallback: Use the overall LY rate applied to the PY monthly volume
        const pyMonthVolume =
          rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
        const pyTotalVolume = rowData.py_case_equivalent_volume || 1; // Avoid div by zero
        const pyTotalGSV = rowData.py_gross_sales_value || 0;
        const lyRate = pyTotalVolume === 0 ? 0 : pyTotalGSV / pyTotalVolume;
        return pyMonthVolume * lyRate; // Apply LY rate to PY monthly volume
      }
      if (fieldName === "py_case_equivalent_volume") {
        return rowData.py_case_equivalent_volume_months?.[month]?.value || 0;
      }
      if (fieldName === "case_equivalent_volume") {
        // Current forecast volume for the month
        return currentMonths[month]?.value || 0;
      }
      console.warn(
        `Cannot determine monthly value for ${fieldName} in ${month}`
      );
      return 0;
    }
  };

  const resultMonthlyData: { [month: string]: number } = {};

  if (guidance.calculation.type === "difference" && guidanceValue.expression) {
    const expressionParts = guidanceValue.expression.split(" - ");
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
    guidanceValue.numerator &&
    guidanceValue.denominator
  ) {
    const numeratorParts = guidanceValue.numerator.split(" - ");
    const numerField1 = numeratorParts[0].trim();
    const numerField2 = numeratorParts[1].trim();
    const denomField = guidanceValue.denominator.trim();

    MONTH_NAMES.forEach((month) => {
      const numerValue1 = getMonthlyValue(numerField1, month);
      const numerValue2 = getMonthlyValue(numerField2, month);
      const denomValue = getMonthlyValue(denomField, month);

      const numerator = numerValue1 - numerValue2;
      resultMonthlyData[month] = denomValue === 0 ? 0 : numerator / denomValue;
    });
    return resultMonthlyData;
  }

  console.error("Unhandled guidance calculation type or structure:", guidance);
  return null; // Indicate calculation failed or wasn't applicable
};

// --- Moved from guidanceCalculationsSlice --- START
// Structure for calculated guidance values (total and/or monthly)
export interface CalculatedGuidanceValue {
  total?: number;
  monthly?: { [month: string]: number };
}

// Helper function to calculate a single guidance metric for a summary aggregate
export const calculateSingleSummaryGuidance = (
  baseData: {
    // Represents either a variant or brand aggregate
    total_ty: number;
    total_py: number;
    total_gsv_ty: number;
    total_gsv_py: number;
    months_ty?: { [key: string]: number }; // Only needed for monthly calcs
    months_py?: { [key: string]: number };
    months_gsv_ty?: { [key: string]: number };
    months_gsv_py?: { [key: string]: number };
  },
  guidance: Guidance,
  calculateMonthly: boolean = false
): CalculatedGuidanceValue => {
  const result: CalculatedGuidanceValue = {};

  // Helper to get total value based on field name
  const getTotalValue = (fieldName: string): number => {
    const value = (() => {
      if (fieldName === "case_equivalent_volume") return baseData.total_ty;
      if (fieldName === "py_case_equivalent_volume") return baseData.total_py;
      if (fieldName === "gross_sales_value") return baseData.total_gsv_ty;
      if (fieldName === "py_gross_sales_value") return baseData.total_gsv_py;
      return 0;
    })();

    return value;
  };

  // Helper to get monthly value based on field name
  const getMonthlyValue = (fieldName: string, month: string): number => {
    if (fieldName === "case_equivalent_volume")
      return baseData.months_ty?.[month] ?? 0;
    if (fieldName === "py_case_equivalent_volume")
      return baseData.months_py?.[month] ?? 0;
    if (fieldName === "gross_sales_value")
      return baseData.months_gsv_ty?.[month] ?? 0;
    if (fieldName === "py_gross_sales_value")
      return baseData.months_gsv_py?.[month] ?? 0;
    return 0;
  };

  // --- Calculate Total ---
  if (typeof guidance.value === "string") {
    result.total = getTotalValue(guidance.value);
  } else {
    const valueDef = guidance.value as GuidanceValue; // Use local GuidanceValue
    const calcType = guidance.calculation.type;

    if (calcType === "difference" && valueDef.expression) {
      const parts = valueDef.expression.split(" - ");
      result.total =
        getTotalValue(parts[0]?.trim()) - getTotalValue(parts[1]?.trim());
    } else if (
      calcType === "percentage" &&
      valueDef.numerator &&
      valueDef.denominator
    ) {
      const numParts = valueDef.numerator.split(" - ");
      const numerator =
        getTotalValue(numParts[0]?.trim()) - getTotalValue(numParts[1]?.trim());
      const denominator = getTotalValue(valueDef.denominator.trim());
      result.total = denominator === 0 ? 0 : numerator / denominator;
    }
  }
  // Apply rounding (or other formatting logic) consistently
  result.total = result.total ? Math.round(result.total * 1000) / 1000 : 0;

  // --- Calculate Monthly (if requested) ---
  if (calculateMonthly && baseData.months_ty) {
    // Ensure monthly source data exists
    result.monthly = {};
    MONTH_NAMES.forEach((month) => {
      let monthlyVal: number | undefined = undefined;
      if (typeof guidance.value === "string") {
        monthlyVal = getMonthlyValue(guidance.value, month);
      } else {
        const valueDef = guidance.value as GuidanceValue; // Use local GuidanceValue
        const calcType = guidance.calculation.type;

        if (calcType === "difference" && valueDef.expression) {
          const parts = valueDef.expression.split(" - ");
          const val1 = getMonthlyValue(parts[0]?.trim(), month);
          const val2 = getMonthlyValue(parts[1]?.trim(), month);
          monthlyVal = val1 - val2;
        } else if (
          calcType === "percentage" &&
          valueDef.numerator &&
          valueDef.denominator
        ) {
          const numParts = valueDef.numerator.split(" - ");
          const numerVal1 = getMonthlyValue(numParts[0]?.trim(), month);
          const numerVal2 = getMonthlyValue(numParts[1]?.trim(), month);
          const denomVal = getMonthlyValue(valueDef.denominator.trim(), month);
          const numerator = numerVal1 - numerVal2;
          monthlyVal = denomVal === 0 ? 0 : numerator / denomVal;
        }
      }
      // Apply rounding (or other formatting logic) consistently
      result.monthly![month] =
        monthlyVal !== undefined ? Math.round(monthlyVal * 1000) / 1000 : 0;
    });
  }

  return result;
};
// --- Moved from guidanceCalculationsSlice --- END

// Re-export or define types needed for the aggregation functions
export type {
  SummaryVariantAggregateData,
  SummaryBrandAggregateData,
} from "../summary/summary"; // Assuming types are defined there

// --- NEW Aggregation Function --- START
interface AggregationResult {
  variantsAggArray: SummaryVariantAggregateData[];
  brandAggsMap: Map<string, SummaryBrandAggregateData>;
  maxActualIndex: number;
}

// Helper function for rounding numbers (copied from depletionSlice.ts)
function roundToWhole(num: number | null | undefined): number {
  return Math.round(num || 0);
}

// --- Helper Type for intermediate market buckets ---
interface MarketLevelBucket {
  market_id: string;
  market_name?: string;
  brand?: string;
  variant?: string;
  variant_id?: string;
  variant_size_pack_desc: string;
  month: number; // Month number (1-12)
  case_equivalent_volume: number;
  py_case_equivalent_volume: number;
  gross_sales_value: number;
  py_gross_sales_value: number;
  data_type?: string; // e.g., 'actual_complete', 'forecast'
  is_manual_input?: boolean; // Keep track if source was manual
}

export const aggregateSummaryData = (
  rawVolumeData: RawDepletionForecastItem[], // Market-level data
  customerRawVolumeData: RawDepletionForecastItem[], // Customer-level data
  marketData: MarketData[], // Metadata to know how each market is managed
  pendingChangesMap: Map<string, RestoredState> // Pending changes from Depletions view
): AggregationResult => {
  let maxActualIndex = -1;
  const marketLevelBuckets: { [key: string]: MarketLevelBucket } = {}; // Key: marketId_variantDesc_month

  // --- Create Customer ID to Market ID lookup ---
  const customerToMarketMap = new Map<string, string>();
  marketData.forEach((market) => {
    market.customers?.forEach((customer) => {
      customerToMarketMap.set(customer.customer_id, market.market_id); // Use customer_id
    });
  });

  // --- STEP 1: Populate marketLevelBuckets based on managed_by ---
  marketData.forEach((market) => {
    const marketId = market.market_id;
    const marketName = market.market_name;
    const managedBy = market.settings?.managed_by;

    if (managedBy === "Market") {
      // Process directly from rawVolumeData
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
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type, // Keep original data_type
              is_manual_input: item.is_manual_input, // Keep original manual flag
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;

          // Update maxActualIndex from market data
          if (item.data_type?.includes("actual")) {
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    } else if (managedBy === "Customer") {
      // Aggregate from customerRawVolumeData
      customerRawVolumeData
        .filter(
          (item) => customerToMarketMap.get(item.customer_id || "") === marketId
        )
        .forEach((item) => {
          if (!item.variant_size_pack_desc || !item.month) return;
          const key = `${marketId}_${item.variant_size_pack_desc}_${item.month}`;
          if (!marketLevelBuckets[key]) {
            marketLevelBuckets[key] = {
              market_id: marketId, // Use the parent market ID
              market_name: marketName, // Use the parent market name
              brand: item.brand,
              variant: item.variant,
              variant_id: item.variant_id,
              variant_size_pack_desc: item.variant_size_pack_desc,
              month: item.month,
              case_equivalent_volume: 0,
              py_case_equivalent_volume: 0,
              gross_sales_value: 0,
              py_gross_sales_value: 0,
              data_type: item.data_type, // Try to preserve data_type from customer level
              is_manual_input: item.is_manual_input, // Try to preserve flag
            };
          }
          marketLevelBuckets[key].case_equivalent_volume +=
            Number(item.case_equivalent_volume) || 0;
          marketLevelBuckets[key].py_case_equivalent_volume +=
            Number(item.py_case_equivalent_volume) || 0;
          marketLevelBuckets[key].gross_sales_value +=
            Number(item.gross_sales_value) || 0;
          marketLevelBuckets[key].py_gross_sales_value +=
            Number(item.py_gross_sales_value) || 0;
          // Ensure data_type reflects 'actual' if any constituent customer row was actual
          if (item.data_type?.includes("actual")) {
            marketLevelBuckets[key].data_type = "actual_complete"; // Mark aggregate as actual if any part is
            // Update maxActualIndex from customer data
            const currentMonthIndex = Number(item.month) - 1;
            if (currentMonthIndex >= 0 && currentMonthIndex < 12) {
              maxActualIndex = Math.max(maxActualIndex, currentMonthIndex);
            }
          }
        });
    }
  });

  // --- STEP 2: Apply Pending Changes ---
  pendingChangesMap.forEach((change, redisKey) => {
    // Attempt to parse market_id or customer_id from the key
    // Format: forecast:market_id:variant_desc or forecast:customer_id:variant_desc:customer_id
    const parts = redisKey.split(":");
    if (parts.length < 3) return; // Invalid key format

    let marketId: string | undefined;
    let variantDesc = parts[2];
    const potentialId = parts[1]; // Could be market_id or customer_id

    // Determine if it's a market or customer change based on key structure and lookup
    if (parts.length === 4 && parts[3] === potentialId) {
      // Likely customer key format forecast:customer_id:variant_desc:customer_id
      marketId = customerToMarketMap.get(potentialId);
    } else if (!customerToMarketMap.has(potentialId)) {
      // If potentialId is not a known customer_id, assume it's a market_id
      // Check if this market exists in marketData
      if (marketData.some((m) => m.market_id === potentialId)) {
        marketId = potentialId;
      }
    }

    // If we couldn't determine a valid market ID for the change, skip it
    if (!marketId) {
      // console.warn(`Could not determine market ID for pending change key: ${redisKey}`);
      return;
    }

    // Apply the changes month by month
    Object.entries(change.months).forEach(([monthName, monthData]) => {
      // Cast monthName to the specific union type expected by MONTH_NAMES.indexOf
      const typedMonthName = monthName as (typeof MONTH_NAMES)[number];
      const monthNum = MONTH_NAMES.indexOf(typedMonthName) + 1;
      if (monthNum > 0) {
        const bucketKey = `${marketId}_${variantDesc}_${monthNum}`;
        if (marketLevelBuckets[bucketKey]) {
          // Simply overwrite the volume with the value from the pending change
          marketLevelBuckets[bucketKey].case_equivalent_volume =
            monthData.value;
          // Mark as manual if the change was a manual edit
          marketLevelBuckets[bucketKey].is_manual_input =
            monthData.isManuallyModified ?? change.isManualEdit; // Prioritize monthData flag
          // If the pending change month is past the original maxActualIndex,
          // we assume it's now a 'forecast' value, even if it overwrites an 'actual'.
          // (Actuals are determined by the initial load, pending changes modify forecasts).
          if (monthNum - 1 > maxActualIndex) {
            marketLevelBuckets[bucketKey].data_type = "forecast";
          }
          // We don't adjust PY or GSV based on pending changes, only TY volume.
        } else {
          // If bucket doesn't exist, it means this item wasn't in the original dataset (perhaps filtered out?)
          // We won't create new items here based on pending changes alone for summary.
        }
      }
    });
  });

  // --- STEP 3: Final Aggregation into Summary Structures ---
  const variantAggregation: {
    [variantKey: string]: SummaryVariantAggregateData;
  } = {};

  // --- Use marketLevelBuckets as the source for final aggregation ---
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
    const gsv_ty = bucket.gross_sales_value;
    const gsv_py = bucket.py_gross_sales_value;

    // Initialize variant aggregate if it doesn't exist
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
        months_gsv_ty: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_gsv_ty: 0,
        months_gsv_py: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_gsv_py: 0,
      };
    }

    // Accumulate values into the FINAL summary aggregates
    variantAggregation[variantKey].months[monthName] += volume;
    variantAggregation[variantKey].months_py_volume[monthName] += py_volume;
    variantAggregation[variantKey].months_gsv_ty[monthName] += gsv_ty;
    variantAggregation[variantKey].months_gsv_py[monthName] += gsv_py;
  });

  // --- Post-process VARIANT Aggregates (Totals, Rounding) ---
  let variantsAggArray = Object.values(variantAggregation)
    .map((variantAggRow) => {
      // Calculate totals from accumulated monthly values
      variantAggRow.total = Object.values(variantAggRow.months).reduce(
        (s: number, v: number) => s + v,
        0
      );
      variantAggRow.total_py_volume = Object.values(
        variantAggRow.months_py_volume
      ).reduce((s: number, v: number) => s + v, 0);
      variantAggRow.total_gsv_ty = Object.values(
        variantAggRow.months_gsv_ty
      ).reduce((s: number, v: number) => s + v, 0);
      variantAggRow.total_gsv_py = Object.values(
        variantAggRow.months_gsv_py
      ).reduce((s: number, v: number) => s + v, 0);

      // Round totals
      variantAggRow.total = roundToWhole(variantAggRow.total); // Use helper function
      variantAggRow.total_py_volume = roundToWhole(
        variantAggRow.total_py_volume
      );
      variantAggRow.total_gsv_ty = roundToWhole(variantAggRow.total_gsv_ty);
      variantAggRow.total_gsv_py = roundToWhole(variantAggRow.total_gsv_py);

      // Round monthly values
      MONTH_NAMES.forEach((m) => {
        variantAggRow.months[m] = roundToWhole(variantAggRow.months[m]);
        variantAggRow.months_py_volume[m] = roundToWhole(
          variantAggRow.months_py_volume[m]
        );
        variantAggRow.months_gsv_ty[m] = roundToWhole(
          variantAggRow.months_gsv_ty[m]
        );
        variantAggRow.months_gsv_py[m] = roundToWhole(
          variantAggRow.months_gsv_py[m]
        );
      });

      return variantAggRow;
    })
    .filter((row) => Math.abs(row.total) > 0.001); // Filter out zero-total rows

  // --- Aggregate Brands from the processed variants ---
  const brandAggsMap = new Map<string, SummaryBrandAggregateData>();
  variantsAggArray.forEach((variantRow) => {
    const brandKey = variantRow.brand;
    if (!brandAggsMap.has(brandKey)) {
      brandAggsMap.set(brandKey, {
        id: brandKey,
        brand: brandKey,
        months: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total: 0,
        // Initialize new monthly fields for brand aggregate
        months_py_volume: MONTH_NAMES.reduce(
          (acc, m) => ({ ...acc, [m]: 0 }),
          {}
        ),
        months_gsv_ty: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        months_gsv_py: MONTH_NAMES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
        total_py_volume: 0,
        total_gsv_ty: 0,
        total_gsv_py: 0,
      });
    }
    const brandAgg = brandAggsMap.get(brandKey)!;
    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] += variantRow.months[m];
      // Accumulate new monthly fields
      brandAgg.months_py_volume[m] += variantRow.months_py_volume[m];
      brandAgg.months_gsv_ty[m] += variantRow.months_gsv_ty[m];
      brandAgg.months_gsv_py[m] += variantRow.months_gsv_py[m];
    });
    brandAgg.total += variantRow.total;
    brandAgg.total_py_volume += variantRow.total_py_volume;
    brandAgg.total_gsv_ty += variantRow.total_gsv_ty;
    brandAgg.total_gsv_py += variantRow.total_gsv_py;
  });

  // --- Round Brand Aggregates ---
  brandAggsMap.forEach((brandAgg) => {
    brandAgg.total = roundToWhole(brandAgg.total);
    brandAgg.total_py_volume = roundToWhole(brandAgg.total_py_volume);
    brandAgg.total_gsv_ty = roundToWhole(brandAgg.total_gsv_ty);
    brandAgg.total_gsv_py = roundToWhole(brandAgg.total_gsv_py);
    MONTH_NAMES.forEach((m) => {
      brandAgg.months[m] = roundToWhole(brandAgg.months[m]);
      // Round new monthly fields
      brandAgg.months_py_volume[m] = roundToWhole(brandAgg.months_py_volume[m]);
      brandAgg.months_gsv_ty[m] = roundToWhole(brandAgg.months_gsv_ty[m]);
      brandAgg.months_gsv_py[m] = roundToWhole(brandAgg.months_gsv_py[m]);
    });
  });

  // --- Return the final aggregated results ---
  return {
    variantsAggArray,
    brandAggsMap,
    maxActualIndex,
  };
};
// --- NEW Aggregation Function --- END

// --- Function to calculate all guidance for summary view ---
// Takes aggregated data and selected guidance, returns state object
// Keyed by aggregate type (brand:id or variant:brand_variantId) and then guidance ID
// --- Calculate All Summary Guidance --- START
export const calculateAllSummaryGuidance = (
  variantsAggArray: SummaryVariantAggregateData[],
  brandAggsMap: Map<string, SummaryBrandAggregateData>,
  selectedGuidance: Guidance[],
  selectedRowGuidance: Guidance[]
): SummaryCalculationsState => {
  // Return type is SummaryCalculationsState from slice

  const calculatedResults: SummaryCalculationsState = {};
  const allGuidanceDefs = [...selectedGuidance, ...selectedRowGuidance];
  const uniqueGuidanceDefs = Array.from(
    new Map(allGuidanceDefs.map((g) => [g.id, g])).values()
  );
  const rowGuidanceIds = new Set(selectedRowGuidance.map((g) => g.id));

  // Calculate for Variants
  variantsAggArray.forEach((variantAgg) => {
    const key = `variant:${variantAgg.brand}_${
      variantAgg.variant_id || variantAgg.variant
    }`;
    calculatedResults[key] = {};
    // Prepare the base data object expected by calculateSingleSummaryGuidance
    const baseData = {
      total_ty: variantAgg.total,
      total_py: variantAgg.total_py_volume,
      total_gsv_ty: variantAgg.total_gsv_ty,
      total_gsv_py: variantAgg.total_gsv_py,
      // Map source fields to expected fields
      months_ty: variantAgg.months,
      months_py: variantAgg.months_py_volume,
      months_gsv_ty: variantAgg.months_gsv_ty,
      months_gsv_py: variantAgg.months_gsv_py,
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

  // Calculate for Brands
  brandAggsMap.forEach((brandAgg, brandName) => {
    const key = `brand:${brandName}`;
    calculatedResults[key] = {};
    // Prepare the base data object expected by calculateSingleSummaryGuidance
    const baseData = {
      total_ty: brandAgg.total,
      total_py: brandAgg.total_py_volume,
      total_gsv_ty: brandAgg.total_gsv_ty,
      total_gsv_py: brandAgg.total_gsv_py,
      // Map source fields to expected fields (using fields added in previous step)
      months_ty: brandAgg.months,
      months_py: brandAgg.months_py_volume,
      months_gsv_ty: brandAgg.months_gsv_ty,
      months_gsv_py: brandAgg.months_gsv_py,
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
// --- Calculate All Summary Guidance --- END

// --- NEW Total Guidance Calculation Function --- START
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

  // Calculate total values across all brands
  const totalMonths_ty: { [key: string]: number } = {};
  const totalMonths_py: { [key: string]: number } = {};
  const totalMonths_gsv_ty: { [key: string]: number } = {};
  const totalMonths_gsv_py: { [key: string]: number } = {};
  let total_ty = 0;
  let total_py = 0;
  let total_gsv_ty = 0;
  let total_gsv_py = 0;

  // Aggregate totals from all brands
  brandAggsMap.forEach((brandAgg) => {
    // Add to grand totals
    total_ty += brandAgg.total;
    total_py += brandAgg.total_py_volume;
    total_gsv_ty += brandAgg.total_gsv_ty;
    total_gsv_py += brandAgg.total_gsv_py;

    // Add to monthly totals
    MONTH_NAMES.forEach((month) => {
      totalMonths_ty[month] =
        (totalMonths_ty[month] || 0) + (brandAgg.months_ty?.[month] || 0);
      totalMonths_py[month] =
        (totalMonths_py[month] || 0) + (brandAgg.months_py?.[month] || 0);
      totalMonths_gsv_ty[month] =
        (totalMonths_gsv_ty[month] || 0) +
        (brandAgg.months_gsv_ty?.[month] || 0);
      totalMonths_gsv_py[month] =
        (totalMonths_gsv_py[month] || 0) +
        (brandAgg.months_gsv_py?.[month] || 0);
    });
  });

  // Round all totals
  total_ty = Math.round(total_ty);
  total_py = Math.round(total_py);
  total_gsv_ty = Math.round(total_gsv_ty * 100) / 100;
  total_gsv_py = Math.round(total_gsv_py * 100) / 100;

  // Round monthly totals
  MONTH_NAMES.forEach((month) => {
    totalMonths_ty[month] = Math.round(totalMonths_ty[month]);
    totalMonths_py[month] = Math.round(totalMonths_py[month]);
    totalMonths_gsv_ty[month] =
      Math.round(totalMonths_gsv_ty[month] * 100) / 100;
    totalMonths_gsv_py[month] =
      Math.round(totalMonths_gsv_py[month] * 100) / 100;
  });

  // Calculate guidance for totals
  const baseData = {
    total_ty,
    total_py,
    total_gsv_ty,
    total_gsv_py,
    months_ty: totalMonths_ty,
    months_py: totalMonths_py,
    months_gsv_ty: totalMonths_gsv_ty,
    months_gsv_py: totalMonths_gsv_py,
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
// --- NEW Total Guidance Calculation Function --- END
