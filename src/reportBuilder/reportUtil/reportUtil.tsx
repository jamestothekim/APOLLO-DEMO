import { ChipOwnProps } from "@mui/material/Chip";
// --- Import Export utilities needed here ---
// import {
//   exportToCSV,
//   type ExportableData,
//   type Guidance, // exportToCSV might depend on this type signature
// } from "../../volume/depletions/util/depletionsUtil"; // Path from reportUtil/ up to src/ then down
// -------------------------------------------

// Define the structure for a dimension
export interface ReportDimension {
  id: string; // Unique identifier (e.g., 'brand', 'market_id')
  label: string; // User-friendly display name (e.g., 'Brand', 'Market')
  type: "dimension" | "measure"; // Distinguish between categories and values
  aggregation?: "sum" | "avg" | "count"; // How to aggregate if it's a measure (optional for dimensions)
  format?: "number" | "currency" | "string"; // How to format the value (primarily for measures)
}

// Define the structure for a dimension placed in a drop zone
export interface PlacedDimension extends ReportDimension {
  area: "filters" | "rows" | "columns" | "available"; // Where the dimension is placed
  // Add filter-specific properties if needed later (e.g., selected values)
  filterValues?: string[];
}

// Month names for mapping
const MONTH_ABBREVIATIONS = [
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

// Define the available dimensions based on the data schema
export const AVAILABLE_DIMENSIONS: ReportDimension[] = [
  { id: "brand", label: "Brand", type: "dimension", format: "string" },
  { id: "variant", label: "Variant", type: "dimension", format: "string" },
  { id: "market", label: "Market", type: "dimension", format: "string" },
  { id: "customer", label: "Customer", type: "dimension", format: "string" },
  {
    id: "variant_size_pack_desc",
    label: "Size Pack",
    type: "dimension",
    format: "string",
  },
  { id: "month", label: "Month", type: "dimension", format: "number" },
  { id: "year", label: "Year", type: "dimension", format: "number" },
  { id: "data_type", label: "Data Type", type: "dimension", format: "string" }, // e.g., 'actual', 'forecast'
  // Define Measures
  {
    id: "case_equivalent_volume",
    label: "Volume (TY)",
    type: "measure",
    aggregation: "sum",
    format: "number",
  },
  {
    id: "py_case_equivalent_volume",
    label: "Volume (PY)",
    type: "measure",
    aggregation: "sum",
    format: "number",
  },
  {
    id: "gross_sales_value",
    label: "GSV (TY)",
    type: "measure",
    aggregation: "sum",
    format: "currency",
  },
  {
    id: "py_gross_sales_value",
    label: "GSV (PY)",
    type: "measure",
    aggregation: "sum",
    format: "currency",
  },
  // Potentially add calculated measures later (e.g., Volume Growth %)
];

// --- Define Filterable Dimensions --- START
const FILTERABLE_DIMENSION_IDS: Set<string> = new Set([
  "brand",
  "customer",
  "market",
  "month",
  "variant",
  "variant_size_pack_desc",
  "year",
]);

export const FILTERABLE_DIMENSIONS = AVAILABLE_DIMENSIONS.filter((d) =>
  FILTERABLE_DIMENSION_IDS.has(d.id)
).sort((a, b) => a.label.localeCompare(b.label));
// --- Define Filterable Dimensions --- END

export interface AggregationResult {
  rows: string[]; // Actual header values for rows (e.g., ['Balvenie', 'Glenfiddich'])
  columns: string[]; // Actual header values for columns (e.g., ['2024', '2025'])
  data: (number | null)[][]; // Matrix of aggregated values, null if no data for a cell
  valueFormat?: "number" | "currency" | "string"; // Format of the aggregated value
}

export const processReportData = (
  rawData: any[],
  // Ensure filters are expected to have filterValues
  filters: (ReportDimension & { filterValues?: string[] })[],
  rows: ReportDimension[],
  columns: ReportDimension[],
  valueDimension: ReportDimension
): AggregationResult => {
  if (!valueDimension || valueDimension.type !== "measure") {
    console.error("Invalid or missing measure dimension provided.");
    return { rows: [], columns: [], data: [[]], valueFormat: "number" };
  }

  // --- 1. Calculate last actual month index from raw data ---
  let lastActualMonthIndex = -1;
  rawData.forEach((item) => {
    if (item?.data_type?.includes("actual")) {
      const monthIndex = (item.month || 0) - 1; // Convert to 0-based index
      if (monthIndex >= 0 && monthIndex < 12) {
        lastActualMonthIndex = Math.max(lastActualMonthIndex, monthIndex);
      }
    }
  });

  // --- 2. Filter Data ---
  let filteredData = [...rawData];
  filters.forEach((filter) => {
    // Check if there are selected values for this filter
    if (filter.filterValues && filter.filterValues.length > 0) {
      // Convert selected values to a Set for efficient lookup
      const selectedValuesSet = new Set(filter.filterValues);
      filteredData = filteredData.filter((item) => {
        const itemValue = item[filter.id]?.toString();
        // Keep the item if its value for the filter dimension is in the selected set
        return itemValue !== undefined && selectedValuesSet.has(itemValue);
      });
    }
  });
  // ---------------------

  // --- 3. Get Unique Headers ---
  const rowDimensionIds = rows.map((d) => d.id);
  const columnDimensionIds = columns.map((d) => d.id);

  const getUniqueValues = (dimensionId: string): string[] => {
    // --- Always return full month list if dimension is month ---
    if (dimensionId === "month") {
      return [...MONTH_ABBREVIATIONS]; // Return all 12 month abbreviations
    }
    // ----------------------------------------------------------

    // --- Logic for other dimensions remains the same ---
    if (!dimensionId) return [];
    const values = new Set<string>();
    filteredData.forEach((item) => {
      const value = item[dimensionId]?.toString();
      if (value !== undefined && value !== null && value !== "") {
        values.add(value);
      }
    });

    const sortedValues = Array.from(values);
    const isNumericSort = dimensionId === "year"; // Month is handled above

    if (isNumericSort) {
      sortedValues.sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    // // Previous month mapping is removed as we return the full list above
    // if (isMonth) { ... }

    return sortedValues;
  };

  // For now, handle only one dimension in rows/columns
  const rowHeaderValues =
    rowDimensionIds.length > 0 ? getUniqueValues(rowDimensionIds[0]) : [];
  const columnHeaderValues =
    columnDimensionIds.length > 0 ? getUniqueValues(columnDimensionIds[0]) : [];

  // --- 4. Aggregate Data --- //
  const aggregationMap: { [rowKey: string]: { [colKey: string]: number } } = {};
  const rowDimensionId = rowDimensionIds[0]; // Assuming one row dim
  const columnDimensionId = columnDimensionIds[0]; // Assuming one col dim

  filteredData.forEach((item) => {
    let value = parseFloat(item[valueDimension.id]) || 0; // Get the measure value

    // Apply projected volume logic for case_equivalent_volume (matching depletionCalculations.ts)
    if (valueDimension.id === "case_equivalent_volume") {
      const monthIndex = (item.month || 0) - 1; // Convert to 0-based index
      const isCurrentMonth = monthIndex === lastActualMonthIndex + 1;
      const useProjected =
        isCurrentMonth &&
        item.market_area_name !== "Control" &&
        item.projected_case_equivalent_volume !== undefined &&
        !item.is_manual_input;

      if (useProjected) {
        value = parseFloat(item.projected_case_equivalent_volume) || 0;
      }
    }

    // Determine the keys for the map based on whether row/col dimensions exist
    const rowKey = rowDimensionId
      ? item[rowDimensionId]?.toString() ?? "__null__"
      : "__total__";
    const colKey = columnDimensionId
      ? item[columnDimensionId]?.toString() ?? "__null__"
      : "__total__";

    if (!aggregationMap[rowKey]) {
      aggregationMap[rowKey] = {};
    }
    if (!aggregationMap[rowKey][colKey]) {
      aggregationMap[rowKey][colKey] = 0;
    }

    // Perform aggregation (defaulting to sum for now)
    // TODO: Implement other aggregation types (avg, count) later
    aggregationMap[rowKey][colKey] += value;
  });

  // --- 5. Structure Results --- //
  const dataMatrix: (number | null)[][] = [];

  // Helper to get the original numeric month string for lookup if needed
  const getOriginalKey = (headerValue: string, dimensionId: string): string => {
    if (dimensionId === "month") {
      const index = MONTH_ABBREVIATIONS.indexOf(headerValue);
      return index !== -1 ? (index + 1).toString() : headerValue;
    }
    return headerValue;
  };

  if (rowHeaderValues.length > 0) {
    rowHeaderValues.forEach((rowValue) => {
      const originalRowKey = getOriginalKey(rowValue, rowDimensionId);
      const rowData: (number | null)[] = [];
      if (columnHeaderValues.length > 0) {
        columnHeaderValues.forEach((colValue) => {
          const originalColKey = getOriginalKey(colValue, columnDimensionId);
          rowData.push(
            aggregationMap[originalRowKey]?.[originalColKey] ?? null
          );
        });
      } else {
        rowData.push(aggregationMap[originalRowKey]?.__total__ ?? null);
      }
      dataMatrix.push(rowData);
    });
  } else if (columnHeaderValues.length > 0) {
    const rowData: (number | null)[] = [];
    columnHeaderValues.forEach((colValue) => {
      const originalColKey = getOriginalKey(colValue, columnDimensionId);
      rowData.push(aggregationMap.__total__?.[originalColKey] ?? null);
    });
    dataMatrix.push(rowData);
  } else {
    dataMatrix.push([aggregationMap.__total__?.__total__ ?? null]);
  }

  return {
    rows: rowHeaderValues, // Return the processed headers (with month names)
    columns: columnHeaderValues, // Return the processed headers (with month names)
    data: dataMatrix,
    valueFormat: valueDimension.format || "number",
  };
};

// Utility function to get a specific dimension definition
export const getDimensionById = (id: string): ReportDimension | undefined => {
  return AVAILABLE_DIMENSIONS.find((dim) => dim.id === id);
};

// Define colors for different dimension types or areas (optional but nice)
export const getDimensionChipColor = (
  dimension: ReportDimension | PlacedDimension
): ChipOwnProps["color"] => {
  if ("area" in dimension) {
    // Color based on where it's placed
    switch (dimension.area) {
      case "filters":
        return "info";
      case "rows":
        return "success";
      case "columns":
        return "warning";
      default:
        return "default";
    }
  } else {
    // Color based on type for available dimensions
    return dimension.type === "measure" ? "secondary" : "primary";
  }
};

// Utility to get unique, sorted string values for a dimension from raw data
export const getUniqueValuesForDimension = (
  rawData: any[],
  dimensionId: string
): string[] => {
  if (!dimensionId || !rawData) return [];
  const values = new Set<string>();
  rawData.forEach((item) => {
    const value = item[dimensionId]?.toString();
    if (value !== undefined && value !== null && value !== "") {
      values.add(value);
    }
  });
  // Simple alphabetical sort for filter options
  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

// --- Dedicated Report CSV Generation ---

// Helper to format values for CSV (handles null and applies basic formatting)
const formatCSVValue = (
  value: number | string | null,
  format?: "number" | "currency" | "string"
): string => {
  if (value === null || value === undefined) return ""; // Empty string for null/undefined in CSV
  let numValue: number | null = null;
  if (typeof value === "string") {
    numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = null; // Not a number
  } else if (typeof value === "number") {
    numValue = value;
  }

  if (numValue !== null) {
    try {
      switch (format) {
        case "currency":
          // Return just the number, no currency symbol for CSV usually
          return numValue.toFixed(2);
        case "number":
          return numValue.toFixed(0);
        default:
          return numValue.toString();
      }
    } catch {
      return value.toString(); // Fallback
    }
  }
  // Handle non-numeric strings or fallbacks
  // Escape quotes within the string by doubling them
  const stringValue = value.toString().replace(/"/g, '""');
  // Enclose in quotes if it contains commas, quotes, or newlines
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue}"`;
  }
  return stringValue;
};

const generateReportCSVContent = (
  aggregationResult: AggregationResult,
  rowDimension: ReportDimension | null,
  columnDimension: ReportDimension | null
  // calculationDimension: ReportDimension | null // Format is in aggregationResult
): string => {
  const {
    rows: rowHeaders,
    columns: colHeaders,
    data,
    valueFormat,
  } = aggregationResult;
  const rowDimLabel = rowDimension?.label || "Row";

  const csvRows: string[] = [];

  // --- Header Row ---
  const headerRow: string[] = [];
  if (rowDimension) {
    headerRow.push(formatCSVValue(rowDimLabel)); // Add row dimension label as first header
  }
  if (columnDimension) {
    colHeaders.forEach((colHeader) =>
      headerRow.push(formatCSVValue(colHeader))
    );
  } else if (rowDimension) {
    // If only rows, add a generic value header
    headerRow.push(
      formatCSVValue(valueFormat === "currency" ? "Value (Currency)" : "Value")
    );
  }
  csvRows.push(headerRow.join(","));

  // --- Data Rows ---
  if (rowHeaders.length > 0) {
    rowHeaders.forEach((rowHeader, rowIndex) => {
      const dataRow: string[] = [formatCSVValue(rowHeader)]; // Start row with row header value
      if (colHeaders.length > 0) {
        colHeaders.forEach((_, colIndex) => {
          dataRow.push(formatCSVValue(data[rowIndex]?.[colIndex], valueFormat));
        });
      } else {
        // Single data column if only rows exist
        dataRow.push(formatCSVValue(data[rowIndex]?.[0], valueFormat));
      }
      csvRows.push(dataRow.join(","));
    });
  } else if (colHeaders.length > 0) {
    // Only columns, single row of data (potentially totals)
    const dataRow: string[] = [formatCSVValue("Total")]; // Placeholder for row header
    colHeaders.forEach((_, colIndex) => {
      dataRow.push(formatCSVValue(data[0]?.[colIndex], valueFormat));
    });
    csvRows.push(dataRow.join(","));
  } else {
    // Single value case
    const dataRow: string[] = [formatCSVValue("Total")]; // Placeholder
    dataRow.push(formatCSVValue(data[0]?.[0], valueFormat));
    csvRows.push(dataRow.join(","));
  }

  return csvRows.join("\n"); // Join all rows with newline characters
};

const triggerCSVDownload = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      filename.endsWith(".csv") ? filename : `${filename}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    console.error("Browser doesn't support automatic download.");
    // TODO: Maybe show CSV content in a modal or new tab as fallback?
  }
};

// --- Update exportReportToCSV to use new functions ---
export const exportReportToCSV = (
  aggregationResult: AggregationResult,
  rowDimension: ReportDimension | null,
  columnDimension: ReportDimension | null,
  calculationDimension: ReportDimension | null
) => {
  const rowDimLabel = rowDimension?.label || "Data"; // Use 'Data' if no row dim
  const colDimLabel = columnDimension?.label || "Data"; // Use 'Data' if no col dim
  const valueLabel = calculationDimension?.label || "Value";

  if (!calculationDimension) {
    console.warn("No calculation selected to export.");
    return;
  }

  // 1. Generate CSV Content String
  const csvContent = generateReportCSVContent(
    aggregationResult,
    rowDimension,
    columnDimension
  );

  // 2. Generate Filename
  let filename = "ReportBuilderExport";
  if (rowDimension) filename += `_${rowDimLabel}`;
  if (columnDimension) filename += `_by_${colDimLabel}`;
  filename += `_${valueLabel}`;
  filename = filename.replace(/\s|\/|\(|\)/g, ""); // Basic sanitization

  // 3. Trigger Download
  triggerCSVDownload(csvContent, filename);
};

// --- Constants --- START
export const TIME_SERIES_DIMENSION_IDS = ["month", "year", "date"];

export interface ReportDimension {
  id: string;
  label: string;
  type: "dimension" | "measure";
  aggregation?: "sum" | "avg" | "count";
  format?: "number" | "currency" | "string";
}
// --- Constants --- END
