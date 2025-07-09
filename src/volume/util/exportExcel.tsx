import * as XLSX from "xlsx";
import { roundToTenth } from "./volumeUtil";
import { MONTH_NAMES } from "./volumeUtil";
import type { Guidance } from "../../redux/guidance/guidanceSlice";
import { isTrends } from "../../redux/guidance/guidanceSlice";
import type { ExtendedForecastData } from "../calculations/depletionCalculations";
import { recalculateGuidance } from "../calculations/guidanceCalculations";

// Helper function to clean values for Excel export
const cleanValue = (value: any): any => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) return "";
    // Check for very large numbers that Excel can't handle
    if (Math.abs(value) > 1e15) return "";
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Check for string representations of problematic numbers
    if (trimmed === "NaN" || trimmed === "Infinity" || trimmed === "-Infinity")
      return "";
    return trimmed;
  }
  return value;
};

// Safe number operations - validate before doing math
const safeRound = (value: any): number => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0;
  if (Math.abs(num) > 1e15) return 0;
  return Math.round(num);
};

const safePercent = (value: any): string => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return "0%";
  if (Math.abs(num) > 1e10) return "0%"; // Cap very large percentages
  return `${safeRound(num * 100)}%`;
};

// Types for export data
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

// Define dimension mappings for guidance rows
const GUIDANCE_DIMENSION_MAPPINGS: {
  [key: string]: {
    dataField: string;
    monthField?: string;
    sheetName: string;
    description: string;
  };
} = {
  // Volume dimensions
  TY: {
    dataField: "case_equivalent_volume",
    monthField: "months",
    sheetName: "TY_Volume",
    description: "This Year Volume",
  },
  PY: {
    dataField: "py_case_equivalent_volume",
    monthField: "py_case_equivalent_volume_months",
    sheetName: "PY_Volume",
    description: "Prior Year Volume",
  },
  LY: {
    dataField: "py_case_equivalent_volume",
    monthField: "py_case_equivalent_volume_months",
    sheetName: "LY_Volume",
    description: "Last Year Volume",
  },
  LC: {
    dataField: "prev_published_case_equivalent_volume",
    monthField: "prev_published_case_equivalent_volume_months",
    sheetName: "LC_Volume",
    description: "Last Consensus Volume",
  },
  // GSV dimensions
  TY_GSV: {
    dataField: "gross_sales_value",
    monthField: "months_gsv_ty",
    sheetName: "TY_GSV",
    description: "This Year Gross Sales Value",
  },
  PY_GSV: {
    dataField: "py_gross_sales_value",
    monthField: "months_gsv_py",
    sheetName: "PY_GSV",
    description: "Prior Year Gross Sales Value",
  },
  LY_GSV: {
    dataField: "py_gross_sales_value",
    monthField: "months_gsv_py",
    sheetName: "LY_GSV",
    description: "Last Year Gross Sales Value",
  },
  LC_GSV: {
    dataField: "lc_gross_sales_value",
    monthField: "lc_gross_sales_value_months",
    sheetName: "LC_GSV",
    description: "Last Consensus Gross Sales Value",
  },
};

/**
 * Enhanced export function that creates multiple Excel worksheets based on selected guidance rows
 * @param data - The data to export
 * @param options - Export options
 */
export const exportToExcelWithGuidanceSheets = (
  data: ExportableData[],
  options?: {
    selectedGuidance?: Guidance[];
    selectedRowGuidance?: Guidance[];
    isSummaryView?: boolean;
    lastActualMonthIndex?: number;
  }
) => {
  const workbook = XLSX.utils.book_new();

  // Extract options with defaults and filter out trends
  const selectedGuidance = options?.selectedGuidance?.filter(
    (g) => !isTrends(g)
  );
  const selectedRowGuidance = options?.selectedRowGuidance?.filter(
    (g) => !isTrends(g)
  );
  const isSummary = options?.isSummaryView ?? false;
  const lastActualIndex = options?.lastActualMonthIndex ?? -1;

  // Create main worksheet with current data (TY Volume)
  const mainSheetData = createSheetData(
    data,
    isSummary,
    lastActualIndex,
    "TY",
    selectedGuidance
  );
  const mainWorksheet = XLSX.utils.aoa_to_sheet(mainSheetData);
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, "TY_Volume");

  // Create additional worksheets for each selected guidance row
  if (selectedRowGuidance && selectedRowGuidance.length > 0) {
    selectedRowGuidance.forEach((guidance) => {
      // Extract dimension from guidance (e.g., 'LY', 'LC', etc.)
      const dimension = extractDimensionFromGuidance(guidance);

      const mapping = GUIDANCE_DIMENSION_MAPPINGS[dimension];

      if (mapping) {
        const sheetData = createSheetData(
          data,
          isSummary,
          lastActualIndex,
          dimension,
          selectedGuidance
        );
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, mapping.sheetName);
      }
    });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = isSummary
    ? `summary_forecast_data_${timestamp}.xlsx`
    : `depletion_forecast_data_${timestamp}.xlsx`;

  // Write and download the workbook
  XLSX.writeFile(workbook, filename);
};

/**
 * NEW: Enhanced summary export that shows all markets by variant
 * @param processedRows - Raw processed forecast rows from Redux
 * @param options - Export options
 */
export const exportSummaryByMarketAndVariant = (
  processedRows: ExtendedForecastData[],
  options?: {
    selectedGuidance?: Guidance[];
    selectedRowGuidance?: Guidance[];
    lastActualMonthIndex?: number;
  }
) => {
  const workbook = XLSX.utils.book_new();
  // Filter out trends from guidance
  const selectedGuidance = options?.selectedGuidance?.filter(
    (g) => !isTrends(g)
  );
  const selectedRowGuidance = options?.selectedRowGuidance?.filter(
    (g) => !isTrends(g)
  );
  const lastActualIndex = options?.lastActualMonthIndex ?? -1;

  // Create market-by-variant export data
  const exportData = processedRows.map((row): ExportableData => {
    const exportMonths: {
      [key: string]: { value: number; isActual?: boolean };
    } = {};
    MONTH_NAMES.forEach((month) => {
      exportMonths[month] = {
        value: row.months[month]?.value || 0,
        isActual: row.months[month]?.isActual || false,
      };
    });

    // Calculate GSV monthly values (TY GSV = TY Volume * GSV Rate)
    const gsvRate = row.gsv_rate || 0;
    const pyGsvRate = row.py_gsv_rate || 0;
    const months_gsv_ty: { [key: string]: { value: number } } = {};
    const months_gsv_py: { [key: string]: { value: number } } = {};

    MONTH_NAMES.forEach((month) => {
      const tyVolume = row.months[month]?.value || 0;
      const pyVolume =
        row.py_case_equivalent_volume_months?.[month]?.value || 0;

      months_gsv_ty[month] = { value: tyVolume * gsvRate };
      months_gsv_py[month] = { value: pyVolume * pyGsvRate };
    });

    return {
      market_id: row.market_id,
      market_name: row.market_name,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      product: row.product,
      brand: row.brand,
      variant: row.variant,
      variant_id: row.variant_id,
      variant_size_pack_id: row.variant_size_pack_id,
      variant_size_pack_desc: row.variant_size_pack_desc,
      forecastLogic: row.forecastLogic,
      months: exportMonths,
      case_equivalent_volume: row.case_equivalent_volume || 0,
      py_case_equivalent_volume: row.py_case_equivalent_volume || 0,
      gross_sales_value: row.gross_sales_value || 0,
      py_gross_sales_value: row.py_gross_sales_value || 0,
      prev_published_case_equivalent_volume:
        row.prev_published_case_equivalent_volume || 0,
      lc_gross_sales_value: row.lc_gross_sales_value || 0,
      // Add GSV rates for calculations
      gsv_rate: row.gsv_rate || 0,
      py_gsv_rate: row.py_gsv_rate || 0,
      // Add monthly data for different dimensions
      py_case_equivalent_volume_months:
        row.py_case_equivalent_volume_months || {},
      prev_published_case_equivalent_volume_months:
        row.prev_published_case_equivalent_volume_months || {},
      lc_gross_sales_value_months: row.lc_gross_sales_value_months || {},
      months_gsv_ty: months_gsv_ty,
      months_gsv_py: months_gsv_py,
      // Add any guidance calculations
      ...Object.fromEntries(
        Object.entries(row).filter(([key]) => key.startsWith("guidance_"))
      ),
    };
  });

  // Recalculate guidance values with the correct guidance definitions
  const recalculatedExportData = exportData.map((row) => {
    if (selectedGuidance && selectedGuidance.length > 0) {
      return recalculateGuidance(row, selectedGuidance);
    }
    return row;
  });

  // Create main worksheet with TY data
  const mainSheetData = createMarketVariantSheetData(
    recalculatedExportData,
    lastActualIndex,
    "TY",
    selectedGuidance
  );
  const mainWorksheet = XLSX.utils.aoa_to_sheet(mainSheetData);
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, "TY_Volume");

  // Create additional worksheets for each selected guidance row
  if (selectedRowGuidance && selectedRowGuidance.length > 0) {
    selectedRowGuidance.forEach((guidance) => {
      const dimension = extractDimensionFromGuidance(guidance);
      const mapping = GUIDANCE_DIMENSION_MAPPINGS[dimension];

      if (mapping) {
        const sheetData = createMarketVariantSheetData(
          recalculatedExportData,
          lastActualIndex,
          dimension,
          selectedGuidance
        );
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, mapping.sheetName);
      }
    });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `summary_by_market_variant_${timestamp}.xlsx`;

  // Write and download the workbook
  XLSX.writeFile(workbook, filename);
};

/**
 * Create sheet data for market-by-variant structure
 */
const createMarketVariantSheetData = (
  data: ExportableData[],
  lastActualMonthIndex: number,
  dimension: string,
  selectedGuidance?: Guidance[]
): any[][] => {
  const monthKeys = MONTH_NAMES;
  const mapping = GUIDANCE_DIMENSION_MAPPINGS[dimension];

  if (!mapping) {
    console.warn(`Unknown dimension: ${dimension}`);
    return [];
  }

  // Base headers for market-by-variant structure
  const baseHeaders = [
    "Market",
    "Brand",
    "Variant",
    `VOL 9L (${dimension})`,
    // Only show LY column if dimension is not LY or LC
    ...(dimension !== "LY" && dimension !== "LC" ? [`VOL 9L (LY)`] : []),
  ];

  // Only show guidance columns for TY dimension, not for other dimensions
  const guidanceHeaders =
    dimension === "TY"
      ? selectedGuidance?.map((guidance) =>
          guidance.sublabel
            ? `${guidance.label} (${guidance.sublabel})`
            : guidance.label
        ) || []
      : [];

  const monthHeaders = monthKeys.map((month, index) => {
    const label = index <= lastActualMonthIndex ? "(ACT)" : "(FCST)";
    return `${month} ${label}`;
  });

  const headerRow = [...baseHeaders, ...guidanceHeaders, ...monthHeaders];

  const dataRows = data.map((item) => {
    // Get total volume for the specified dimension - store as number
    const totalVolume = roundToTenth(
      getValueForDimension(item, mapping.dataField) ?? 0
    );
    const totalVolumeLY = roundToTenth(item.py_case_equivalent_volume ?? 0);

    const baseColumns = [
      cleanValue(item.market_name),
      cleanValue(item.brand),
      cleanValue(item.variant),
      cleanValue(totalVolume),
      // Only include LY column if dimension is not LY or LC
      ...(dimension !== "LY" && dimension !== "LC"
        ? [cleanValue(totalVolumeLY)]
        : []),
    ];

    // Only include guidance columns for TY dimension
    const guidanceColumns =
      dimension === "TY"
        ? selectedGuidance?.map((guidance) => {
            const valueKey = `guidance_${guidance.id}`;
            const rawVal = item[valueKey];

            if (rawVal === undefined) return cleanValue("");

            if (
              guidance.calculation.type === "multi_calc" &&
              typeof rawVal === "object" &&
              rawVal !== null
            ) {
              const parts = guidance.calculation.subCalculations.map((sub) => {
                const subVal = rawVal[sub.id];
                if (subVal === undefined || isNaN(subVal)) return "";
                if (guidance.calculation.format === "percent") {
                  return safePercent(subVal);
                }
                return cleanValue(roundToTenth(subVal));
              });
              return parts.join(" / ");
            }

            const value = rawVal as number;
            if (isNaN(value)) return cleanValue("");

            if (guidance.calculation.format === "percent") {
              return safePercent(value);
            } else if (
              guidance.label &&
              guidance.label.toLowerCase().includes("gsv") &&
              !guidance.label.toLowerCase().includes("%")
            ) {
              // Store GSV as number (Excel will handle formatting)
              return cleanValue(safeRound(roundToTenth(value)));
            }
            return cleanValue(roundToTenth(value));
          }) || []
        : [];

    // Get monthly values for the specified dimension - store as numbers
    const monthValues = monthKeys.map((month) => {
      const value =
        getMonthlyValueForDimension(
          item,
          mapping.monthField || "months",
          month
        ) || 0;
      return cleanValue(roundToTenth(value));
    });

    return [...baseColumns, ...guidanceColumns, ...monthValues];
  });

  return [headerRow, ...dataRows];
};

/**
 * Legacy function for depletion exports
 */
export const exportDepletionsToExcel = (
  data: ExportableData[],
  selectedGuidance?: Guidance[],
  selectedRowGuidance?: Guidance[],
  lastActualMonthIndex?: number
) => {
  exportToExcelWithGuidanceSheets(data, {
    selectedGuidance,
    selectedRowGuidance,
    isSummaryView: false,
    lastActualMonthIndex,
  });
};

/**
 * Extract dimension from guidance object
 */
const extractDimensionFromGuidance = (guidance: Guidance): string => {
  const guidanceAny = guidance as any;
  if (guidanceAny.dimension) {
    return guidanceAny.dimension;
  }

  const label = guidance.label.toUpperCase();

  // Check for LY first (more specific than PY)
  if (label.includes("LY") || label.includes("LAST YEAR")) {
    if (label.includes("GSV") || label.includes("SALES")) {
      return "LY_GSV";
    }
    return "LY";
  }

  if (label.includes("PY") || label.includes("PRIOR")) {
    if (label.includes("GSV") || label.includes("SALES")) {
      return "PY_GSV";
    }
    return "PY";
  }

  if (
    label.includes("LC") ||
    label.includes("CONSENSUS") ||
    label.includes("PUBLISHED")
  ) {
    if (label.includes("GSV") || label.includes("SALES")) {
      return "LC_GSV";
    }
    return "LC";
  }

  if (label.includes("GSV") || label.includes("SALES")) {
    return "TY_GSV";
  }

  return "TY";
};

/**
 * Create sheet data array for legacy structure (brands/variants aggregated)
 */
const createSheetData = (
  data: ExportableData[],
  isSummaryView: boolean,
  lastActualMonthIndex: number,
  dimension: string,
  selectedGuidance?: Guidance[]
): any[][] => {
  const monthKeys = MONTH_NAMES;
  const mapping = GUIDANCE_DIMENSION_MAPPINGS[dimension];

  if (!mapping) {
    console.warn(`Unknown dimension: ${dimension}`);
    return [];
  }

  let baseHeaders: string[];
  let dataRows: any[][];

  if (isSummaryView) {
    baseHeaders = [
      "BRAND / VARIANT",
      `VOL 9L (${dimension})`,
      // Only show LY column if dimension is not LY or LC
      ...(dimension !== "LY" && dimension !== "LC" ? [`VOL 9L (LY)`] : []),
    ];

    // Only show guidance columns for TY dimension, not for other dimensions
    const guidanceHeaders =
      dimension === "TY"
        ? selectedGuidance?.map((guidance) =>
            guidance.sublabel
              ? `${guidance.label} (${guidance.sublabel})`
              : guidance.label
          ) || []
        : [];

    const monthHeaders = monthKeys.map((month, index) => {
      const label = index <= lastActualMonthIndex ? "(ACT)" : "(FCST)";
      return `${month} ${label}`;
    });

    const headerRow = [...baseHeaders, ...guidanceHeaders, ...monthHeaders];

    dataRows = data.map((item) => {
      const brandVariant = item.isBrandRow ? item.brand : item.variant || "";
      const totalVolume = roundToTenth(
        getValueForDimension(item, mapping.dataField) ?? 0
      );
      const totalVolumeLY = roundToTenth(item.py_case_equivalent_volume ?? 0);

      const baseColumns = [
        cleanValue(brandVariant),
        cleanValue(totalVolume),
        // Only include LY column if dimension is not LY or LC
        ...(dimension !== "LY" && dimension !== "LC"
          ? [cleanValue(totalVolumeLY)]
          : []),
      ];

      // Only include guidance columns for TY dimension
      const guidanceColumns =
        dimension === "TY"
          ? selectedGuidance?.map((guidance) => {
              const valueKey = `guidance_${guidance.id}`;
              const rawVal =
                typeof guidance.value === "string"
                  ? item[guidance.value]
                  : item[valueKey];

              if (rawVal === undefined) return cleanValue("");

              if (
                guidance.calculation.type === "multi_calc" &&
                typeof rawVal === "object" &&
                rawVal !== null
              ) {
                const parts = guidance.calculation.subCalculations.map(
                  (sub) => {
                    const subVal = rawVal[sub.id];
                    if (subVal === undefined || isNaN(subVal)) return "";
                    if (guidance.calculation.format === "percent") {
                      return safePercent(subVal);
                    }
                    return cleanValue(roundToTenth(subVal));
                  }
                );
                return parts.join(" / ");
              }

              const value = rawVal as number;
              if (isNaN(value)) return cleanValue("");

              if (guidance.calculation.format === "percent") {
                return safePercent(value);
              } else if (
                guidance.label &&
                guidance.label.toLowerCase().includes("gsv") &&
                !guidance.label.toLowerCase().includes("%")
              ) {
                // Store GSV as number (Excel will handle formatting)
                return cleanValue(safeRound(roundToTenth(value)));
              }
              return cleanValue(roundToTenth(value));
            }) || []
          : [];

      const monthValues = monthKeys.map((month) => {
        const value =
          getMonthlyValueForDimension(
            item,
            mapping.monthField || "months",
            month
          ) || 0;
        return cleanValue(roundToTenth(value));
      });

      return [...baseColumns, ...guidanceColumns, ...monthValues];
    });

    return [headerRow, ...dataRows];
  } else {
    // Depletion view logic
    baseHeaders = [
      "Market",
      ...(data.some((row) => row.customer_name) ? ["Customer"] : []),
      "Product",
      // Only show Forecast Logic for TY dimension
      ...(dimension === "TY" ? ["Forecast Logic"] : []),
      `VOL 9L (${dimension})`,
    ];

    // Only show guidance columns for TY dimension, not for other dimensions
    const guidanceHeaders =
      dimension === "TY"
        ? selectedGuidance?.map((guidance) =>
            guidance.sublabel
              ? `${guidance.label} (${guidance.sublabel})`
              : guidance.label
          ) || []
        : [];

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
      const totalVolume = roundToTenth(
        getValueForDimension(item, mapping.dataField) ?? 0
      );

      const baseColumns = [
        cleanValue(item.market_name),
        ...(data.some((r) => r.customer_name)
          ? [cleanValue(item.customer_name || "")]
          : []),
        cleanValue(
          item.product && item.product.includes(" - ")
            ? item.product.split(" - ")[1]
            : item.product || ""
        ),
        // Only include Forecast Logic for TY dimension
        ...(dimension === "TY" ? [cleanValue(item.forecastLogic)] : []),
        cleanValue(totalVolume),
      ];

      // Only include guidance columns for TY dimension
      const guidanceColumns =
        dimension === "TY"
          ? selectedGuidance?.map((guidance) => {
              const valueKey = `guidance_${guidance.id}`;
              const rawVal = item[valueKey];

              if (rawVal === undefined) return cleanValue("");

              if (
                guidance.calculation.type === "multi_calc" &&
                typeof rawVal === "object" &&
                rawVal !== null
              ) {
                const parts = guidance.calculation.subCalculations.map(
                  (sub) => {
                    const subVal = rawVal[sub.id];
                    if (subVal === undefined || isNaN(subVal)) return "";
                    if (guidance.calculation.format === "percent") {
                      return safePercent(subVal);
                    }
                    return cleanValue(roundToTenth(subVal));
                  }
                );
                return parts.join(" / ");
              }

              const value = rawVal as number;
              if (isNaN(value)) return cleanValue("");

              if (guidance.calculation.format === "percent") {
                return safePercent(value);
              } else if (
                guidance.label &&
                guidance.label.toLowerCase().includes("gsv") &&
                !guidance.label.toLowerCase().includes("%")
              ) {
                // Store GSV as number (Excel will handle formatting)
                return cleanValue(safeRound(roundToTenth(value)));
              }
              return cleanValue(roundToTenth(value));
            }) || []
          : [];

      const monthValues = monthKeys.map((month) => {
        const value =
          getMonthlyValueForDimension(
            item,
            mapping.monthField || "months",
            month
          ) || 0;
        return cleanValue(roundToTenth(value));
      });

      return [
        ...baseColumns,
        ...guidanceColumns,
        ...monthValues,
        item.commentary || "",
      ];
    });

    return [headerRow, ...dataRows];
  }
};

/**
 * Helper function to get value for a specific dimension
 */
const getValueForDimension = (item: any, field: string): number => {
  if (field === "months") {
    // Calculate total from months
    const total = Object.values(item.months || {}).reduce(
      (sum: number, month: any) => {
        const value = Number(month?.value || 0);
        return sum + (isNaN(value) || !isFinite(value) ? 0 : value);
      },
      0
    );
    return isNaN(total) || !isFinite(total) ? 0 : total;
  }
  const value = Number(item[field] || 0);
  return isNaN(value) || !isFinite(value) ? 0 : value;
};

/**
 * Helper function to get monthly value for a specific dimension
 */
const getMonthlyValueForDimension = (
  item: any,
  monthField: string,
  month: string
): number => {
  let value: number;
  if (monthField === "months") {
    value = Number(item.months?.[month]?.value || 0);
  } else {
    value = Number(item[monthField]?.[month]?.value || 0);
  }
  return isNaN(value) || !isFinite(value) ? 0 : value;
};
