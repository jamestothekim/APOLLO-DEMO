import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  useTheme,
  Chip,
  CircularProgress,
  Collapse,
  TableCell,
  TableRow,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import { roundToTenth, MONTH_NAMES } from "../util/volumeUtil";
import { exportSummaryByMarketAndVariant } from "../util/exportExcel";
import type { MarketData } from "../volumeForecast";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../redux/store";
import { useAppSelector } from "../../redux/store";
import { fetchPendingChanges } from "../../redux/slices/pendingChangesSlice";
import {
  selectSelectedBrands,
  selectSelectedMarkets,
  updateSelectedBrands,
  updateSelectedMarkets,
} from "../../redux/slices/userSettingsSlice";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Toolbox } from "../components/toolbox";
import { LineChart } from "@mui/x-charts";
import type { SummaryCalculationsState } from "../../redux/slices/guidanceCalculationsSlice";
import {
  selectProcessedForecastRows,
  selectFilteredSummaryAggregates,
} from "../../redux/slices/depletionSlice";
import { GuidanceDialog } from "../guidance/guidance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { CalculatedGuidanceValue } from "../calculations/guidanceCalculations";
import {
  calculateAllSummaryGuidance,
  calculateTotalGuidance,
} from "../calculations/guidanceCalculations";
import {
  GuidanceRenderer,
  MonthlyGuidanceRenderer,
} from "../guidance/guidanceRenderer";
import {
  selectSummaryPendingCols as selectPendingSummaryGuidanceCols,
  selectSummaryPendingRows as selectPendingSummaryGuidanceRows,
} from "../../redux/guidance/guidanceSlice";
import type { Guidance } from "../../redux/guidance/guidanceSlice";
import { RootState } from "../../redux/store";

// --- Export these types --- START
export interface SummaryVariantAggregateData {
  id: string;
  brand: string;
  variant_id?: string;
  variant: string;
  months: { [key: string]: number };
  total: number;
  months_py_volume: { [key: string]: number };
  total_py_volume: number;
  months_gsv_ty?: { [key: string]: number };
  total_gsv_ty: number;
  months_gsv_py?: { [key: string]: number };
  total_gsv_py: number;
  prev_published_case_equivalent_volume: number;
  months_lc_volume: { [key: string]: number };
  lc_gross_sales_value: number;
  months_lc_gsv?: { [key: string]: number };
  [guidanceKey: string]: any;
}

export interface SummaryBrandAggregateData {
  id: string;
  brand: string;
  months: { [key: string]: number };
  total: number;
  total_py_volume: number;
  total_gsv_ty: number;
  total_gsv_py: number;
  prev_published_case_equivalent_volume: number;
  months_lc_volume: { [key: string]: number };
  lc_gross_sales_value: number;
  months_lc_gsv?: { [key: string]: number };
  [key: string]: any;
}

export interface DisplayRow
  extends Partial<SummaryBrandAggregateData>,
    Partial<SummaryVariantAggregateData> {
  id: string;
  isBrandRow: boolean;
  level: number;
  brand: string;
  variant?: string;
  months: { [key: string]: number };
  total: number;
  isParent: boolean;
  parentId?: string;
}
// --- End Export these types ---

interface SummaryProps {
  availableBrands: string[];
  marketData: MarketData[];
}

// --- NEW Component for Rendering a Single Expanded Row ---
interface ExpandedGuidanceRowProps {
  guidance: Guidance;
  rowId: string; // Pass the original row ID for keys
  flatColumns: Column[];
  calcStatus: "idle" | "calculating" | "succeeded";
  calculationResult: CalculatedGuidanceValue | undefined;
}

const ExpandedGuidanceRow: React.FC<ExpandedGuidanceRowProps> = ({
  guidance,
  rowId,
  flatColumns,
  calcStatus,
  calculationResult,
}) => {
  const cellPaddingSx = { py: "6px", px: "16px", borderBottom: 0 };
  const labelColumnKey = "row_guidance_label";

  return (
    <TableRow
      key={`${rowId}-expanded-${guidance.id}`}
      sx={{ backgroundColor: "action.hover" }}
    >
      {flatColumns.map((col) => {
        let cellContent: React.ReactNode = null;
        if (col.key === labelColumnKey) {
          cellContent = (
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: "bold", lineHeight: 1.2 }}
              >
                {guidance.label}
              </Typography>
              {guidance.sublabel && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ fontStyle: "italic", lineHeight: 1.1 }}
                >
                  {guidance.sublabel}
                </Typography>
              )}
            </Box>
          );
        } else if (col.key.startsWith("months.")) {
          const month = col.key.split(".")[1];
          cellContent = (
            <MonthlyGuidanceRenderer
              guidance={guidance}
              month={month}
              calculationResult={calculationResult}
              calcStatus={calcStatus}
            />
          );
        }
        return (
          <TableCell
            key={`${rowId}-expanded-${guidance.id}-${col.key}`}
            align={col.align || "left"}
            sx={{ ...col.sx, ...cellPaddingSx }}
          >
            {cellContent}
          </TableCell>
        );
      })}
    </TableRow>
  );
};
// --- End NEW Component ---

export const Summary = ({ availableBrands, marketData }: SummaryProps) => {
  const dispatch: AppDispatch = useDispatch();
  const lastSyncTrigger = useAppSelector((state) => state.sync.lastSyncTrigger);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewType, setViewType] = useState<"table" | "graph">("table");
  const theme = useTheme();

  // Get selected brands and markets from Redux state
  const persistedSelectedBrands = useSelector(selectSelectedBrands);
  const persistedSelectedMarkets = useSelector(selectSelectedMarkets);

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [filterChangeCount, setFilterChangeCount] = useState(0);
  const [prevFilters, setPrevFilters] = useState({
    markets: selectedMarkets,
    brands: selectedBrands,
  });

  // Update local state when persisted state changes
  useEffect(() => {
    if (persistedSelectedBrands !== undefined) {
      setSelectedBrands(persistedSelectedBrands);
    }
  }, [persistedSelectedBrands]);

  useEffect(() => {
    if (persistedSelectedMarkets !== undefined) {
      setSelectedMarkets(persistedSelectedMarkets);
    }
  }, [persistedSelectedMarkets]);

  // Only increment filterChangeCount when filters actually change
  useEffect(() => {
    const hasFilterChanged =
      JSON.stringify(prevFilters.markets) !== JSON.stringify(selectedMarkets) ||
      JSON.stringify(prevFilters.brands) !== JSON.stringify(selectedBrands);

    if (hasFilterChanged) {
      setFilterChangeCount((prev) => prev + 1);
      setPrevFilters({
        markets: selectedMarkets,
        brands: selectedBrands,
      });
    }
  }, [selectedMarkets, selectedBrands]);

  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const selectedGuidance: Guidance[] = useSelector(
    selectPendingSummaryGuidanceCols
  );
  const selectedRowGuidance: Guidance[] = useSelector(
    selectPendingSummaryGuidanceRows
  );

  // NEW: Centralized processing selectors
  const processedRows = useSelector(selectProcessedForecastRows);
  const centralizedAggregates = useAppSelector((state) =>
    selectFilteredSummaryAggregates(state, selectedMarkets, selectedBrands)
  );

  const [variantAggregateData, setVariantAggregateData] = useState<
    SummaryVariantAggregateData[]
  >([]);
  const [brandLevelAggregates, setBrandLevelAggregates] = useState<
    Map<string, SummaryBrandAggregateData>
  >(new Map());
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(
    new Set()
  );
  const [expandedGuidanceRowIds, setExpandedGuidanceRowIds] = useState<
    Set<string>
  >(new Set());
  const [lastActualMonthIndex, setLastActualMonthIndex] = useState<number>(-1);

  // --- NEW State for Local Calculation Results and Status --- START
  const [guidanceResults, setGuidanceResults] =
    useState<SummaryCalculationsState>({});
  const [localCalcStatus, setLocalCalcStatus] = useState<
    "idle" | "calculating" | "succeeded"
  >("idle");
  // --- NEW State for Local Calculation Results and Status --- END

  const MAX_CHIPS_VISIBLE = 3;

  useEffect(() => {
    dispatch(
      fetchPendingChanges({
        markets: null,
        brands: null,
      })
    );
  }, [lastSyncTrigger, dispatch]);

  useEffect(() => {
    // Use centralized filtered processing
    const { variantsAggArray, brandAggsMap, maxActualIndex } =
      centralizedAggregates;

    setVariantAggregateData(variantsAggArray);
    setBrandLevelAggregates(brandAggsMap);
    setLastActualMonthIndex(maxActualIndex);

    // Guidance calculations remain the same
    if (
      (selectedGuidance.length > 0 || selectedRowGuidance.length > 0) &&
      (variantsAggArray.length > 0 || brandAggsMap.size > 0)
    ) {
      const calculatedResults = calculateAllSummaryGuidance(
        variantsAggArray,
        brandAggsMap,
        selectedGuidance,
        selectedRowGuidance,
        maxActualIndex
      );
      setGuidanceResults(calculatedResults);
    } else {
      setGuidanceResults({});
    }

    setLocalCalcStatus("succeeded");
  }, [
    // Centralized processing dependencies
    centralizedAggregates,
    processedRows,
    selectedGuidance,
    selectedRowGuidance,
    selectedMarkets,
    selectedBrands,
    dispatch,
  ]);

  const handleBrandExpandClick = useCallback((brandId: string) => {
    setExpandedBrandIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(brandId)) {
        newIds.delete(brandId);
      } else {
        newIds.add(brandId);
      }
      return newIds;
    });
  }, []);

  const handleGuidanceExpandClick = useCallback(
    (variantAggregateId: string) => {
      setExpandedGuidanceRowIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (newIds.has(variantAggregateId)) {
          newIds.delete(variantAggregateId);
        } else {
          newIds.add(variantAggregateId);
        }
        return newIds;
      });
    },
    []
  );

  const displayData = useMemo((): DisplayRow[] => {
    const rows: DisplayRow[] = [];

    // Calculate totals for the total row
    const totalRowMonths: { [key: string]: number } = {};
    let totalRowTotal = 0;
    let totalRowPyVolume = 0;
    let totalRowGsvTy = 0;
    let totalRowGsvPy = 0;

    // Get all brand keys and sort them
    const allBrandKeys = Array.from(brandLevelAggregates.keys()).sort();

    // Iterate over all brands to calculate row data and totals
    allBrandKeys.forEach((brand) => {
      const brandAgg = brandLevelAggregates.get(brand);
      if (brandAgg) {
        // Filtering is now handled centrally by the Redux selector

        const brandAggregateKey = `brand:${brandAgg.id}`;
        const brandGuidanceForRow: { [key: string]: number | undefined } = {};
        if (guidanceResults[brandAggregateKey]) {
          selectedRowGuidance.forEach((guidance) => {
            const result = guidanceResults[brandAggregateKey]?.[guidance.id];
            brandGuidanceForRow[`sortable_guidance_${guidance.id}`] =
              result?.total;
          });
        }

        const brandRow: DisplayRow = {
          ...brandAgg,
          ...brandGuidanceForRow,
          isBrandRow: true,
          level: 0,
          isParent: true, // Add isParent flag for nested sorting
        };
        let brandHasVisibleChildren = false;

        // Add to total row calculations
        totalRowTotal += brandAgg.total || 0;
        totalRowPyVolume += brandAgg.total_py_volume || 0;
        totalRowGsvTy += brandAgg.total_gsv_ty || 0;
        totalRowGsvPy += brandAgg.total_gsv_py || 0;
        // Add monthly totals
        Object.entries(brandAgg.months || {}).forEach(([month, value]) => {
          totalRowMonths[month] = (totalRowMonths[month] || 0) + (value || 0);
        });

        const variantRows: DisplayRow[] = [];
        if (expandedBrandIds.has(brand)) {
          const variantsForBrand = variantAggregateData
            .filter((v) => v.brand === brand)
            .sort((a, b) => a.variant.localeCompare(b.variant));

          variantsForBrand.forEach((variantAgg) => {
            if (Math.abs(variantAgg.total) > 0.001) {
              const variantAggregateKey = `variant:${variantAgg.brand}_${
                variantAgg.variant_id || variantAgg.variant
              }`;
              const variantGuidanceForRow: {
                [key: string]: number | undefined;
              } = {};
              if (guidanceResults[variantAggregateKey]) {
                selectedRowGuidance.forEach((guidance) => {
                  const result =
                    guidanceResults[variantAggregateKey]?.[guidance.id];
                  variantGuidanceForRow[`sortable_guidance_${guidance.id}`] =
                    result?.total;
                });
              }
              variantRows.push({
                ...variantAgg,
                ...variantGuidanceForRow,
                isBrandRow: false,
                level: 1,
                parentId: brand, // Add parentId for nested sorting
                isParent: false, // Add isParent flag for nested sorting
              });
              brandHasVisibleChildren = true;
            }
          });
        }

        if (
          Math.abs(brandRow.total) > 0.001 ||
          (expandedBrandIds.has(brand) && brandHasVisibleChildren)
        ) {
          rows.push(brandRow);
          rows.push(...variantRows);
        }
      }
    });

    // Add total row at the end if there are any rows
    if (totalRowTotal > 0) {
      const filteredBrandAggregates = new Map<
        string,
        SummaryBrandAggregateData
      >();
      allBrandKeys.forEach((key: string) => {
        const agg = brandLevelAggregates.get(key);
        if (agg) filteredBrandAggregates.set(key, agg);
      });

      const totalGuidanceResults = calculateTotalGuidance(
        filteredBrandAggregates,
        selectedGuidance,
        selectedRowGuidance,
        lastActualMonthIndex
      );

      // Add total guidance to the guidanceResults state
      guidanceResults["total-row"] = totalGuidanceResults;

      const totalRowGuidanceForRow: { [key: string]: number | undefined } = {};
      selectedRowGuidance.forEach((guidance) => {
        totalRowGuidanceForRow[`sortable_guidance_${guidance.id}`] =
          totalGuidanceResults[guidance.id]?.total;
      });

      const totalRow: DisplayRow = {
        id: "total-row",
        brand: "Portfolio Total",
        months: totalRowMonths,
        total: totalRowTotal,
        total_py_volume: totalRowPyVolume,
        total_gsv_ty: totalRowGsvTy,
        total_gsv_py: totalRowGsvPy,
        isBrandRow: true,
        level: 0,
        isParent: false, // Add isParent flag for nested sorting
        ...totalRowGuidanceForRow,
      };

      rows.push(totalRow);
    }

    // Filter out zero rows, keeping the total row if present
    return rows.filter(
      (row) =>
        row.id === "total-row" || Math.abs(row.total) > 0.001 || row.isBrandRow // Keep brand rows even if total is 0 if they might have children
    );
  }, [
    brandLevelAggregates,
    variantAggregateData,
    expandedBrandIds,
    guidanceResults,
    selectedGuidance,
    selectedRowGuidance,
    selectedBrands,
  ]);

  // Log the final displayData before passing to table
  useEffect(() => {}, [displayData]);

  const columns: Column[] = useMemo(() => {
    const hasRowGuidance =
      selectedRowGuidance && selectedRowGuidance.length > 0;

    // Separate expand column like in productMaster.tsx
    const expandColumn: Column = {
      key: "expand",
      header: "",
      width: 24,
      align: "left",
      render: (_, row: DisplayRow) => (
        <Box sx={{ position: "relative", width: "100%", minHeight: "24px" }}>
          {row.isBrandRow && row.id !== "total-row" && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleBrandExpandClick(row.id);
              }}
              sx={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                p: 0.25,
              }}
            >
              {expandedBrandIds.has(row.id) ? (
                <KeyboardArrowDownIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          )}
        </Box>
      ),
      sortable: false,
    };

    const brandColumn: Column = {
      key: "brand",
      header: "BRAND / VARIANT",
      align: "left",
      sortable: true,
      sortAccessor: (row: DisplayRow) =>
        row.id === "total-row" ? "\uffff" : row.brand,
      extraWide: true,
      render: (_value: any, row: DisplayRow) => {
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: 1, // Add left padding for spacing
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: row.isBrandRow ? "bold" : "normal",
              }}
            >
              {row.isBrandRow ? row.brand : row.variant}
            </Typography>
          </Box>
        );
      },
    };

    const tyVolColumn: Column = {
      key: "total",
      header: "VOL 9L",
      subHeader: "TY",
      align: "right" as const,
      sortable: true,
      sortAccessor: (row: DisplayRow) =>
        row.id === "total-row" ? Infinity : row.total,
      render: (value: number) =>
        roundToTenth(value).toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }) ?? "0.0",
    };

    const monthColumns: Column[] = MONTH_NAMES.map(
      (month, index): Column => ({
        key: `months.${month}`,
        header: month,
        subHeader:
          index <= lastActualMonthIndex ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "100%",
              }}
            >
              <Box
                component="span"
                sx={{ flexGrow: 1, textAlign: "center", fontStyle: "italic" }}
              >
                ACT
              </Box>
              <CheckCircleIcon
                fontSize="inherit"
                color="primary"
                sx={{
                  fontSize: "1.0em",
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </Box>
          ) : index === lastActualMonthIndex + 1 ? (
            "PROJ"
          ) : (
            "FCST"
          ),
        align: "right" as const,
        sortable: true,
        sortAccessor: (row: DisplayRow) =>
          row.id === "total-row" ? Infinity : row.months?.[month],
        render: (_value: any, row: DisplayRow) => {
          if (localCalcStatus === "calculating" && !row.months?.[month]) {
            return <CircularProgress size={16} thickness={4} />;
          }
          return (
            roundToTenth(row.months?.[month]).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }) ?? "0.0"
          );
        },
      })
    );

    // Map selected guidance definitions to table columns
    const guidanceColumns: Column[] = selectedGuidance.map(
      (guidance): Column => {
        return {
          key: `guidance_${guidance.id}`, // Unique key for the column
          header: guidance.label,
          subHeader: guidance.sublabel,
          align: "right" as const,
          sortable: true,
          sortAccessor: (row: DisplayRow) =>
            row.id === "total-row"
              ? Infinity
              : (row as any)[`sortable_guidance_${guidance.id}`],
          sx: { minWidth: 90 },
          render: (_value: any, row: DisplayRow) => {
            // --- Standard Rendering Logic --- START
            // Always use the GuidanceCellRenderer, relying on calculatedResults
            const aggregateKey =
              row.id === "total-row"
                ? "total-row"
                : row.isBrandRow
                ? `brand:${row.id}`
                : `variant:${row.brand}_${row.variant_id || row.variant}`;
            const calculationResult =
              guidanceResults[aggregateKey]?.[guidance.id];

            return (
              <GuidanceRenderer
                guidance={guidance} // Pass the full guidance definition
                calculationResult={calculationResult}
                calcStatus={localCalcStatus} // Pass the status
              />
            );
            // --- Standard Rendering Logic --- END
          },
        };
      }
    );

    const rowGuidanceColumn: Column | null = hasRowGuidance
      ? {
          key: "row_guidance_label",
          header: <ViewHeadlineOutlinedIcon fontSize="small" />,
          align: "center" as const,
          sx: { minWidth: 120, py: "6px", px: "16px" },
          render: (_value: any, row: DisplayRow) => {
            const isGuidanceExpanded = expandedGuidanceRowIds.has(row.id);

            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  height: "100%",
                  width: "100%",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                  >
                    VOL 9L
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ fontStyle: "italic", lineHeight: 1.1 }}
                  >
                    TY
                  </Typography>
                </Box>
                <IconButton
                  aria-label="expand row guidance"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGuidanceExpandClick(row.id);
                  }}
                  className="row-expand-button"
                  sx={{
                    position: "absolute",
                    right: -10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    p: 0.25,
                    visibility: row.id === "total-row" ? "visible" : "hidden",
                    ".MuiTableRow-root:hover &": { visibility: "visible" },
                  }}
                >
                  {isGuidanceExpanded ? (
                    <KeyboardArrowDownIcon fontSize="inherit" />
                  ) : (
                    <ChevronRightIcon fontSize="inherit" />
                  )}
                </IconButton>
              </Box>
            );
          },
        }
      : null;

    let combinedColumns: Column[] = [
      expandColumn, // Add expand column first
      brandColumn,
      tyVolColumn,
      ...guidanceColumns,
    ];

    if (rowGuidanceColumn) {
      combinedColumns.push(rowGuidanceColumn);
    }

    combinedColumns.push(...monthColumns);

    // Add right border to the last non-month column (adjust index for new expand column)
    const lastValueColIndex =
      2 + guidanceColumns.length + (rowGuidanceColumn ? 1 : 0); // Changed from 1 to 2
    if (
      lastValueColIndex >= 0 &&
      lastValueColIndex < combinedColumns.length - MONTH_NAMES.length
    ) {
      combinedColumns[lastValueColIndex] = {
        ...combinedColumns[lastValueColIndex],
        sx: {
          ...(combinedColumns[lastValueColIndex].sx || {}),
          borderRight: "1px solid rgba(224, 224, 224, 1)",
        },
      };
    }

    return combinedColumns;
  }, [
    selectedRowGuidance,
    expandedBrandIds,
    expandedGuidanceRowIds,
    handleBrandExpandClick,
    handleGuidanceExpandClick,
    lastActualMonthIndex,
    guidanceResults,
    localCalcStatus,
    selectedGuidance,
    selectedBrands,
  ]);

  // Select all processed forecast rows (no filtering) for export
  const allProcessedRows = useSelector((state: RootState) => {
    const { marketRows, customerRows } = selectProcessedForecastRows(state);

    // Avoid double-counting by using customer-level data when available, market-level otherwise
    const marketsWithCustomers = new Set(
      customerRows.map((row) => row.market_id).filter(Boolean)
    );

    // Use customer rows for markets with customer breakdown, market rows for others
    const marketOnlyRows = marketRows.filter(
      (row) => !marketsWithCustomers.has(row.market_id)
    );
    return [...marketOnlyRows, ...customerRows];
  });

  const handleExport = () => {
    // Use the new market-by-variant export function with actual guidance
    exportSummaryByMarketAndVariant(allProcessedRows, {
      selectedGuidance: selectedGuidance, // Pass actual column guidance
      selectedRowGuidance: selectedRowGuidance,
      lastActualMonthIndex,
    });
  };

  const series = useMemo(() => {
    const brandDataArray = Array.from(brandLevelAggregates.values()).sort(
      (a, b) => a.brand.localeCompare(b.brand)
    );

    // Calculate total for all brands
    const totalMonths: { [key: string]: number } = {};
    let totalTotal = 0;

    brandDataArray.forEach((brandAgg) => {
      totalTotal += brandAgg.total || 0;
      Object.entries(brandAgg.months || {}).forEach(([month, value]) => {
        totalMonths[month] = (totalMonths[month] || 0) + (value || 0);
      });
    });

    const seriesData = brandDataArray.map((brandAgg, index) => {
      const colors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.info.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        "#FFC107",
        "#4CAF50",
        "#2196F3",
        "#9C27B0",
        "#FF5722",
        "#795548",
        "#607D8B",
        "#E91E63",
      ];
      return {
        label: brandAgg.brand,
        data: MONTH_NAMES.map((month) => brandAgg.months?.[month] || 0),
        color: colors[index % colors.length],
      };
    });

    return seriesData;
  }, [brandLevelAggregates, theme]);

  const renderExpandedRowContent = (
    row: DisplayRow,
    flatColumns: Column[]
  ): React.ReactNode => {
    if (!selectedRowGuidance || selectedRowGuidance.length === 0) {
      return null;
    }

    const aggregateKey =
      row.id === "total-row"
        ? "total-row"
        : row.isBrandRow
        ? `brand:${row.id}`
        : `variant:${row.brand}_${row.variant_id || row.variant}`;

    return selectedRowGuidance.map((guidance) => {
      const calculationResult =
        row.id === "total-row"
          ? guidanceResults["total-row"]?.[guidance.id]
          : guidanceResults[aggregateKey]?.[guidance.id];

      return (
        <ExpandedGuidanceRow
          key={`${row.id}-expanded-${guidance.id}`}
          guidance={guidance}
          rowId={row.id}
          flatColumns={flatColumns}
          calculationResult={calculationResult}
          calcStatus={localCalcStatus}
        />
      );
    });
  };

  const handleColumns = () => setColumnsDialogOpen(true);

  // Update the brands change handler to only update local state
  const handleBrandsChange = (_: any, newValue: string[]) => {
    setSelectedBrands(newValue);
    dispatch(updateSelectedBrands(newValue));
  };

  // Add markets change handler
  const handleMarketsChange = (_: any, newValue: any[]) => {
    const marketIds = newValue.map((m) => m.market_id);
    setSelectedMarkets(marketIds);
    dispatch(updateSelectedMarkets(marketIds));
  };

  return (
    <Paper elevation={3}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: (theme) => theme.palette.primary.main,
            }}
          >
            SUMMARY FORECAST
          </Typography>
          <IconButton
            onClick={() => setIsMinimized(!isMinimized)}
            size="small"
            sx={{ ml: 2 }}
          >
            {isMinimized ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>

        <Collapse in={!isMinimized}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ p: 2, display: "flex", gap: 2 }}>
              <Autocomplete
                multiple
                limitTags={MAX_CHIPS_VISIBLE}
                options={marketData}
                value={marketData.filter((m) =>
                  selectedMarkets.includes(m.market_id)
                )}
                onChange={handleMarketsChange}
                isOptionEqualToValue={(option, value) =>
                  option.market_id === value.market_id
                }
                getOptionLabel={(option) => option.market_name}
                renderInput={(params) => (
                  <TextField {...params} label="Filter Markets" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option.market_name}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{
                          borderRadius: "16px",
                          backgroundColor: "transparent",
                          "& .MuiChip-label": { px: 1 },
                        }}
                        {...tagProps}
                      />
                    );
                  })
                }
                sx={{ minWidth: 300, flex: 1 }}
              />

              <Autocomplete
                multiple
                limitTags={MAX_CHIPS_VISIBLE}
                options={availableBrands}
                value={selectedBrands}
                onChange={handleBrandsChange}
                getOptionLabel={(option) => option}
                renderInput={(params) => (
                  <TextField {...params} label="Filter Brands" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{
                          borderRadius: "16px",
                          backgroundColor: "transparent",
                          "& .MuiChip-label": {
                            px: 1,
                          },
                        }}
                        {...tagProps}
                      />
                    );
                  })
                }
                sx={{ minWidth: 300, flex: 1 }}
              />
            </Box>

            <Box sx={{ px: 2 }}>
              <Toolbox
                tools={["columns", "export", "viewToggle"]}
                onUndo={() => Promise.resolve()}
                onColumns={handleColumns}
                onExport={handleExport}
                onViewToggle={() =>
                  setViewType(viewType === "table" ? "graph" : "table")
                }
                canUndo={false}
                viewType={viewType}
                isDepletionsView={false}
              />
            </Box>

            {viewType === "table" ? (
              <DynamicTable
                data={displayData}
                columns={columns}
                loading={localCalcStatus === "calculating"}
                rowsPerPageOptions={[
                  10,
                  20,
                  25,
                  50,
                  { value: -1, label: "All" },
                ]}
                getRowId={(row: DisplayRow) => row.id}
                expandedRowIds={expandedGuidanceRowIds}
                renderExpandedRow={renderExpandedRowContent}
                filterChangeCount={filterChangeCount}
                isNested={true}
              />
            ) : (
              <Box
                sx={{ width: "100%", height: 400, p: 2, position: "relative" }}
              >
                {brandLevelAggregates.size > 0 ? (
                  <LineChart
                    xAxis={[
                      {
                        data: [...MONTH_NAMES],
                        scaleType: "band",
                        label: "Months",
                        labelStyle: {
                          fill: theme.palette.primary.main,
                        },
                        tickLabelStyle: {
                          fill: theme.palette.text.primary,
                        },
                      },
                    ]}
                    series={series}
                    height={350}
                    margin={{ left: 90, right: 20, top: 50, bottom: 30 }}
                    slotProps={{
                      legend: {
                        direction: "row",
                        position: { vertical: "top", horizontal: "middle" },
                        padding: 0,
                        labelStyle: {
                          fontSize: "0.75rem",
                        },
                        itemMarkWidth: 10,
                        itemMarkHeight: 10,
                        itemGap: 10,
                      },
                    }}
                  />
                ) : (
                  brandLevelAggregates.size === 0 &&
                  localCalcStatus !== "calculating" && (
                    <Typography
                      sx={{
                        textAlign: "center",
                        color: "text.secondary",
                        mt: 4,
                      }}
                    >
                      No data available for the selected filters.
                    </Typography>
                  )
                )}
                {localCalcStatus === "calculating" && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
        <GuidanceDialog
          open={columnsDialogOpen}
          onClose={() => setColumnsDialogOpen(false)}
          title="Select Summary Guidance"
          viewContext="summary"
        />
      </Box>
    </Paper>
  );
};
