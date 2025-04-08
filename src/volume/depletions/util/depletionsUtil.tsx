import { ExtendedForecastData } from "../depletions";
import { Box } from "@mui/material";

export type ForecastOption = {
  id: number;
  label: string;
  value: string;
};

export const FORECAST_OPTIONS: ForecastOption[] = [
  { id: 1, label: "Three Month", value: "three_month" },
  { id: 2, label: "Six Month", value: "six_month" },
  { id: 3, label: "Nine Month", value: "nine_month" },
  { id: 4, label: "Flat", value: "flat" },
  { id: 5, label: "Run Rate", value: "run_rate" },
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

      const value = Math.round(Number(item.case_equivalent_volume) * 10) / 10;
      months[monthName] = {
        value: isNaN(value) ? 0 : value,
        isActual: Boolean(item.data_type?.includes("actual")),
        isManuallyModified: Boolean(item.is_manual_input),
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
  [key: string]: any; // Allow for benchmark fields
}

export const exportToCSV = (
  data: ExportableData[],
  selectedBenchmarks?: Benchmark[]
) => {
  const monthKeys = MONTH_NAMES;

  // Build a complete set of headers including benchmarks
  const baseHeaders = [
    "Market",
    ...(data.some((row) => row.customer_name) ? ["Customer"] : []),
    "Product",
    "Forecast Logic",
    "VOL 9L (TY)",
  ];

  // Add benchmark headers
  const benchmarkHeaders =
    selectedBenchmarks?.map((benchmark) =>
      benchmark.sublabel
        ? `${benchmark.label} (${benchmark.sublabel})`
        : benchmark.label
    ) || [];

  // Add month headers with ACT/FCST labels
  const monthHeaders = monthKeys.map((month) => {
    const firstRow = data[0];
    const isActual = firstRow?.months[month]?.isActual;
    return `${month} ${isActual ? "(ACT)" : "(FCST)"}`;
  });

  // Combine all headers for CSV
  const headerRow = [...baseHeaders, ...benchmarkHeaders, ...monthHeaders];

  // Format each data row with proper formatting
  const dataRows = data.map((item) => {
    // Format the total volume with 2 decimal places (hundredths)
    const totalVolume = calculateTotal(item.months);
    const formattedTotal = totalVolume.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Base columns
    const baseColumns = [
      item.market_name,
      ...(data.some((r) => r.customer_name) ? [item.customer_name || ""] : []),
      item.product.includes(" - ")
        ? item.product.split(" - ")[1]
        : item.product,
      item.forecastLogic,
      formattedTotal,
    ];

    // Format benchmark values
    const benchmarkColumns =
      selectedBenchmarks?.map((benchmark) => {
        // Get benchmark value from the row
        const value =
          typeof benchmark.value === "string"
            ? item[benchmark.value]
            : item[`benchmark_${benchmark.id}`];

        if (value === undefined || isNaN(value)) return "";

        // Apply appropriate formatting based on benchmark type
        if (benchmark.calculation.format === "percent") {
          return `${Math.round(value * 100)}%`;
        } else if (
          benchmark.label.toLowerCase().includes("gsv") &&
          !benchmark.label.toLowerCase().includes("%")
        ) {
          // Currency format for GSV values
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
        } else {
          // Standard number format with 2 decimal places (hundredths)
          return value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }
      }) || [];

    // Format month values with 2 decimal places (hundredths)
    const monthValues = monthKeys.map((month) => {
      const value = item.months[month]?.value || 0;
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    // Combine all columns for this row
    return [...baseColumns, ...benchmarkColumns, ...monthValues];
  });

  // Convert rows to CSV format, properly handling commas and quotes
  const processedRows = dataRows.map((row) =>
    row
      .map((cell) => {
        const stringCell = String(cell);
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
  link.setAttribute("download", "forecast_data.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

// Add this type to handle benchmark data
export interface BenchmarkData {
  [key: string]: number;
}

// Add new types for calculation structure
export interface BenchmarkCalculation {
  type: "direct" | "percentage" | "difference";
  format?: "number" | "percent";
}

export interface BenchmarkValue {
  numerator?: string;
  denominator?: string;
  expression?: string;
}

export interface Benchmark {
  id: number;
  label: string;
  sublabel?: string;
  value: string | BenchmarkValue;
  calculation: BenchmarkCalculation;
}

export const processBenchmarkValue = (
  data: any[],
  benchmark: Benchmark,
  isCustomerView: boolean
): { [key: string]: number } => {
  const benchmarkData: { [key: string]: number } = {};
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

  // Then process the aggregated data according to benchmark type
  Object.entries(aggregatedData).forEach(([key, values]) => {
    if (typeof benchmark.value === "string") {
      // Direct value (like py_case_equivalent_volume)
      const fieldName = benchmark.value;
      benchmarkData[key] = Math.round(values[fieldName] * 100) / 100;
    } else {
      // Calculated value
      const value = benchmark.value as BenchmarkValue;

      if (
        benchmark.calculation.type === "percentage" &&
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
        benchmarkData[key] =
          denominatorValue === 0 ? 0 : numeratorValue / denominatorValue;
      } else if (
        benchmark.calculation.type === "difference" &&
        value.expression
      ) {
        // Handle difference calculations
        // For example: "gross_sales_value - py_gross_sales_value"
        const expressionParts = value.expression.split(" - ");
        const minuend = values[expressionParts[0]];
        const subtrahend = values[expressionParts[1]];
        benchmarkData[key] = minuend - subtrahend;
      } else {
        benchmarkData[key] = 0;
      }
    }
  });

  return benchmarkData;
};

// Add this new centralized function to recalculate benchmark values
export const recalculateBenchmarks = (
  row: any,
  selectedBenchmarks: Benchmark[]
): any => {
  if (!selectedBenchmarks || selectedBenchmarks.length === 0) {
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
      console.log(`Updating GSV for ${updatedRow.id}:`, {
        oldGSV: currentGSV,
        newGSV: estimatedGSV,
        volumeRatio,
        LY_volume: updatedRow.py_case_equivalent_volume,
        TY_volume: totalVolume,
        LY_GSV: updatedRow.py_gross_sales_value,
      });

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

  // Log values to help diagnose issues
  console.log("Benchmark calculation data:", {
    id: updatedRow.id,
    case_equivalent_volume: updatedRow.case_equivalent_volume,
    py_case_equivalent_volume: updatedRow.py_case_equivalent_volume,
    gross_sales_value: updatedRow.gross_sales_value,
    py_gross_sales_value: updatedRow.py_gross_sales_value,
  });

  // Now recalculate all benchmarks
  selectedBenchmarks.forEach((benchmark) => {
    if (typeof benchmark.value === "string") {
      // Direct values don't need recalculation as they come directly from the source data
      // These include py_case_equivalent_volume, gross_sales_value, py_gross_sales_value, etc.
    } else {
      // For calculated values (difference, percentage)
      if (
        benchmark.calculation.type === "difference" &&
        benchmark.value.expression
      ) {
        const expressionParts = benchmark.value.expression.split(" - ");
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
        updatedRow[`benchmark_${benchmark.id}`] = result;

        // Log calculation for debugging
        console.log(
          `Calculating difference for ${benchmark.label}: ${field1}(${value1}) - ${field2}(${value2}) = ${result}`
        );
      } else if (
        benchmark.calculation.type === "percentage" &&
        benchmark.value.numerator &&
        benchmark.value.denominator
      ) {
        // Parse the numerator which is an expression like "field1 - field2"
        const numeratorParts = benchmark.value.numerator.split(" - ");
        const numerField1 = numeratorParts[0].trim();
        const numerField2 = numeratorParts[1].trim();

        // Get denominator field
        const denomField = benchmark.value.denominator.trim();

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
        updatedRow[`benchmark_${benchmark.id}`] = result;

        // Log calculation for debugging
        console.log(
          `Calculating percentage for ${benchmark.label}: (${numerField1}(${numerValue1}) - ${numerField2}(${numerValue2}))/${denomField}(${denomValue}) = ${result}`
        );
      }
    }
  });

  return updatedRow;
};

export const formatBenchmarkValue = (
  value: number | undefined,
  format: string = "number",
  benchmarkType?: string
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
    benchmarkType &&
    benchmarkType.toLowerCase().includes("gsv") &&
    !benchmarkType.toLowerCase().includes("%")
  ) {
    const formattedValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  // For other number values
  const formattedValue = roundedValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
