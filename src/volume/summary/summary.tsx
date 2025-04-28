import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Typography,
  IconButton,
  useTheme,
  OutlinedInput,
  Chip,
  CircularProgress,
  Collapse,
  TableCell,
  TableRow,
} from "@mui/material";
import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import {
  exportToCSV,
  MONTH_NAMES,
  formatGuidanceValue,
  Guidance,
  ExportableData,
  type CalculatedGuidanceValue,
  aggregateSummaryData,
  calculateAllSummaryGuidance,
  calculateTotalGuidance,
} from "../util/volumeUtil";
import type { MarketData } from "../../volume/volumeForecast";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchPendingChanges } from "../../redux/pendingChangesSlice";
import type { RestoredState } from "../../redux/pendingChangesSlice";
import {
  setPendingSummaryCols,
  setPendingSummaryRows,
  selectPendingGuidanceSummaryColumns,
  selectPendingGuidanceSummaryRows,
} from "../../redux/userSettingsSlice";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Toolbox } from "../components/toolbox";
import { LineChart } from "@mui/x-charts";
import type { SummaryCalculationsState } from "../../redux/guidanceCalculationsSlice";
import {
  selectRawVolumeData,
  selectVolumeDataStatus,
  selectCustomerRawVolumeData,
  selectCustomerVolumeDataStatus,
} from "../../redux/depletionSlice";
import { GuidanceDialog } from "../components/guidance";

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
  months_gsv_ty: { [key: string]: number };
  total_gsv_ty: number;
  months_gsv_py: { [key: string]: number };
  total_gsv_py: number;
  [key: string]: any;
}

export interface SummaryBrandAggregateData {
  id: string;
  brand: string;
  months: { [key: string]: number };
  total: number;
  total_py_volume: number;
  total_gsv_ty: number;
  total_gsv_py: number;
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
}
// --- End Export these types ---

const DEFAULT_SELECTED_BRANDS = [
  "Balvenie",
  "Glenfiddich",
  "Leyenda Del Milagro",
  "Hendricks",
  "Tullamore Dew",
  "Reyka",
  "Clan MacGregor",
  "Monkey Shoulder",
];

interface SummaryProps {
  availableBrands: string[];
  marketData: MarketData[];
  availableGuidance: Guidance[];
}

// --- Helper Component for Rendering Guidance Cells ---
interface GuidanceCellRendererProps {
  aggregateKey: string;
  guidance: Guidance; // Pass the full guidance object
  calculationResult: CalculatedGuidanceValue | undefined;
  calcStatus: "idle" | "calculating" | "succeeded";
}

const GuidanceCellRenderer: React.FC<GuidanceCellRendererProps> = ({
  guidance,
  calculationResult,
  calcStatus,
}) => {
  // Show loading spinner based on prop
  if (calcStatus === "calculating") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <CircularProgress size={16} thickness={4} />
      </Box>
    );
  }
  // Display calculated total value from prop
  if (calculationResult && calculationResult.total !== undefined) {
    return (
      <>
        {/* Use Fragment to avoid unnecessary divs */}
        {formatGuidanceValue(
          calculationResult.total,
          guidance.calculation.format,
          guidance.label
        )}
      </>
    );
  }

  return <>-</>; // Placeholder
};
// --- End Helper Component ---

// --- Helper Component for Rendering Monthly Guidance Cells --- START
interface MonthlyGuidanceCellRendererProps {
  aggregateKey: string;
  guidance: Guidance;
  month: string;
  calculationResult: CalculatedGuidanceValue | undefined;
  calcStatus: "idle" | "calculating" | "succeeded";
}

const MonthlyGuidanceCellRenderer: React.FC<
  MonthlyGuidanceCellRendererProps
> = ({ guidance, month, calculationResult, calcStatus }) => {
  const monthlyData = calculationResult?.monthly;
  const value = monthlyData ? monthlyData[month] : undefined;

  // Render based on status and value from props
  if (calcStatus === "calculating") {
    return <CircularProgress size={12} thickness={4} />;
  }
  if (calcStatus === "succeeded" && value !== undefined) {
    return (
      <>
        {formatGuidanceValue(
          value,
          guidance.calculation.format,
          guidance.label
        )}
      </>
    );
  }
  return <>-</>; // Placeholder
};
// --- Helper Component for Rendering Monthly Guidance Cells --- END

// --- NEW Component for Rendering a Single Expanded Row ---
interface ExpandedGuidanceRowProps {
  aggregateKey: string;
  guidance: Guidance;
  rowId: string; // Pass the original row ID for keys
  flatColumns: Column[];
  calcStatus: "idle" | "calculating" | "succeeded";
  calculationResult: CalculatedGuidanceValue | undefined;
}

const ExpandedGuidanceRow: React.FC<ExpandedGuidanceRowProps> = ({
  aggregateKey,
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
            <MonthlyGuidanceCellRenderer
              aggregateKey={aggregateKey}
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

export const Summary = ({
  availableBrands,
  marketData,
  availableGuidance,
}: SummaryProps) => {
  const dispatch: AppDispatch = useDispatch();
  const rawVolumeData = useSelector(selectRawVolumeData);
  const depletionsStatus = useSelector(selectVolumeDataStatus);
  const customerRawVolumeData = useSelector(selectCustomerRawVolumeData);
  const customerDepletionsStatus = useSelector(selectCustomerVolumeDataStatus);
  const lastSyncTrigger = useSelector(
    (state: RootState) => state.sync.lastSyncTrigger
  );
  const pendingChanges: RestoredState[] = useSelector(
    (state: RootState) => state.pendingChanges.data
  );
  const pendingChangesStatus = useSelector(
    (state: RootState) => state.pendingChanges.status
  );
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewType, setViewType] = useState<"table" | "graph">("table");
  const theme = useTheme();
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    DEFAULT_SELECTED_BRANDS
  );
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const selectedGuidance: Guidance[] = useSelector(
    selectPendingGuidanceSummaryColumns
  );
  const selectedRowGuidance: Guidance[] = useSelector(
    selectPendingGuidanceSummaryRows
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

  // --- Add customerToMarketMap generation here, before the useEffect that needs it ---
  const customerToMarketMap = useMemo(() => {
    const map = new Map<string, string>();
    marketData.forEach((market) => {
      market.customers?.forEach((customer) => {
        // Ensure customer_id exists before setting it in the map
        if (customer.customer_id) {
          map.set(customer.customer_id, market.market_id);
        }
      });
    });
    return map;
  }, [marketData]);
  // --- End customerToMarketMap generation ---

  useEffect(() => {
    dispatch(
      fetchPendingChanges({
        markets: null,
        brands: null,
      })
    );
  }, [lastSyncTrigger, dispatch]);

  useEffect(() => {
    // Determine required data sources based on marketData
    const requiresMarketData = marketData.some(
      (m) => m.settings?.managed_by === "Market"
    );
    const requiresCustomerData = marketData.some(
      (m) => m.settings?.managed_by === "Customer"
    );

    // Check status and data presence for each required source
    const marketDataSucceeded =
      depletionsStatus === "succeeded" && rawVolumeData;
    const customerDataSucceeded =
      customerDepletionsStatus === "succeeded" && customerRawVolumeData;

    // Determine if all necessary data is ready
    const marketDataReady = !requiresMarketData || marketDataSucceeded;
    const customerDataReady = !requiresCustomerData || customerDataSucceeded;

    // Check if we are still loading necessary data
    const isLoadingMarket =
      requiresMarketData && depletionsStatus === "loading";
    const isLoadingCustomer =
      requiresCustomerData && customerDepletionsStatus === "loading";

    if (isLoadingMarket || isLoadingCustomer) {
      // Still loading necessary data, reflect this in local status and wait
      setLocalCalcStatus("calculating"); // Show loading state
      setVariantAggregateData([]);
      setBrandLevelAggregates(new Map());
      setLastActualMonthIndex(-1);
      setGuidanceResults({});
      return; // Wait for data
    }

    // Check if required data fetching failed or is not ready yet (e.g., 'idle' or 'failed')
    if (!marketDataReady || !customerDataReady) {
      // Necessary data isn't ready (failed or idle), clear and reset status
      setVariantAggregateData([]);
      setBrandLevelAggregates(new Map());
      setLastActualMonthIndex(-1);
      setGuidanceResults({});
      setLocalCalcStatus("idle");
      return; // Cannot proceed
    }

    // --- If we reach here, all necessary data has succeeded ---

    // --- Filter raw data based on selectedMarkets ---
    const filteredRawVolumeData =
      selectedMarkets.length === 0
        ? rawVolumeData // No filter applied
        : (rawVolumeData || []).filter(
            (
              item // Add null check for safety
            ) => selectedMarkets.includes(item.market_id)
          );

    // Customer data needs mapping back to market ID for filtering
    const filteredCustomerRawVolumeData =
      selectedMarkets.length === 0
        ? customerRawVolumeData // No filter applied
        : (customerRawVolumeData || []).filter((item) => {
            // Add null check for safety
            if (!item.customer_id) return false;
            const marketId = customerToMarketMap.get(item.customer_id); // Use the map created above
            return marketId ? selectedMarkets.includes(marketId) : false;
          });
    // --- End Filtering raw data ---

    setLocalCalcStatus("calculating"); // Start the aggregation calculation

    let pendingChangesMap = new Map<string, RestoredState>();
    if (pendingChangesStatus === "succeeded") {
      pendingChanges.forEach((change: RestoredState) => {
        const key =
          change.key ||
          (change.customer_id
            ? `forecast:${change.customer_id}:${change.variant_size_pack_desc}:${change.customer_id}`
            : `forecast:${change.market_id}:${change.variant_size_pack_desc}`);
        pendingChangesMap.set(key, change);
      });
    }

    const { variantsAggArray, brandAggsMap, maxActualIndex } =
      aggregateSummaryData(
        filteredRawVolumeData, // Use filtered market data
        filteredCustomerRawVolumeData, // Use filtered customer data
        marketData, // Still need full marketData for settings/lookup
        pendingChangesMap
      );

    setVariantAggregateData(variantsAggArray);
    setBrandLevelAggregates(brandAggsMap);
    setLastActualMonthIndex(maxActualIndex);

    if (
      (selectedGuidance.length > 0 || selectedRowGuidance.length > 0) &&
      (variantsAggArray.length > 0 || brandAggsMap.size > 0)
    ) {
      const calculatedResults = calculateAllSummaryGuidance(
        variantsAggArray,
        brandAggsMap,
        selectedGuidance,
        selectedRowGuidance
      );

      setGuidanceResults(calculatedResults);

      console.log("--- Brand Level Guidance Calculation Results ---");
      brandAggsMap.forEach((brandData, brandKey) => {
        const brandAggregateKey = `brand:${brandKey}`;
        if (calculatedResults[brandAggregateKey]) {
          console.log(
            `${brandData.brand} (${brandAggregateKey}):`,
            calculatedResults[brandAggregateKey]
          );
        }
      });
      console.log("--------------------------------------------------");
    } else {
      setGuidanceResults({});
    }
    setLocalCalcStatus("succeeded");
  }, [
    rawVolumeData,
    depletionsStatus,
    customerRawVolumeData,
    customerDepletionsStatus,
    marketData,
    pendingChanges,
    pendingChangesStatus,
    selectedGuidance,
    selectedRowGuidance,
    dispatch,
    selectedMarkets,
    customerToMarketMap,
  ]);

  const handleMarketChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedMarkets(typeof value === "string" ? value.split(",") : value);
  };

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
  };

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

    // Filter brands based on selectedBrands *before* sorting and processing
    const filteredBrandKeys = Array.from(brandLevelAggregates.keys())
      .filter(
        (brand) => selectedBrands.length === 0 || selectedBrands.includes(brand)
      ) // Apply filter
      .sort();

    // Iterate over FILTERED brands to calculate row data and totals
    filteredBrandKeys.forEach((brand) => {
      const brandAgg = brandLevelAggregates.get(brand);
      if (brandAgg) {
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
      // Calculate guidance for total row using the new utility function
      // Calculate total guidance based on the *filtered* brand aggregates
      // We need to pass the filtered map to calculateTotalGuidance or recalculate totals here
      const filteredBrandAggregates = new Map<
        string,
        SummaryBrandAggregateData
      >();
      filteredBrandKeys.forEach((key) => {
        const agg = brandLevelAggregates.get(key);
        if (agg) filteredBrandAggregates.set(key, agg);
      });

      const totalGuidanceResults = calculateTotalGuidance(
        filteredBrandAggregates, // Pass the filtered map
        selectedGuidance,
        selectedRowGuidance
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

    const brandColumn: Column = {
      key: "brand",
      header: "BRAND / VARIANT",
      align: "left",
      sortable: true,
      sortAccessor: (row: DisplayRow) =>
        row.id === "total-row" ? "\uffff" : row.brand,
      extraWide: true,
      render: (_value: any, row: DisplayRow) => {
        const isExpanded = expandedBrandIds.has(row.id);
        const isTotalRow = row.id === "total-row";

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              pl: row.level * 2,
            }}
          >
            {row.isBrandRow && !isTotalRow && (
              <IconButton
                size="small"
                sx={{ mr: 0.5, p: 0.25 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrandExpandClick(row.id);
                }}
              >
                {isExpanded ? (
                  <KeyboardArrowDownIcon fontSize="inherit" />
                ) : (
                  <ChevronRightIcon fontSize="inherit" />
                )}
              </IconButton>
            )}
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
        value?.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }) ?? "0.0",
    };

    const monthColumns: Column[] = MONTH_NAMES.map(
      (month, index): Column => ({
        key: `months.${month}`,
        header: month,
        subHeader: index <= lastActualMonthIndex ? "ACT" : "FCST",
        align: "right" as const,
        sortable: true,
        sortAccessor: (row: DisplayRow) =>
          row.id === "total-row" ? Infinity : row.months?.[month],
        render: (_value: any, row: DisplayRow) => {
          if (depletionsStatus === "loading" && !row.months?.[month]) {
            return <CircularProgress size={16} thickness={4} />;
          }
          return (
            row.months?.[month]?.toLocaleString(undefined, {
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
              <GuidanceCellRenderer
                aggregateKey={aggregateKey}
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
      brandColumn,
      tyVolColumn,
      ...guidanceColumns,
    ];

    if (rowGuidanceColumn) {
      combinedColumns.push(rowGuidanceColumn);
    }

    combinedColumns.push(...monthColumns);

    // Add right border to the last non-month column
    const lastValueColIndex =
      1 + guidanceColumns.length + (rowGuidanceColumn ? 1 : 0);
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
    depletionsStatus,
    guidanceResults,
    localCalcStatus,
    selectedGuidance,
    selectedBrands,
  ]);

  const handleExport = () => {
    if (!displayData || displayData.length === 0) {
      return;
    }

    const formattedData: ExportableData[] = displayData.map(
      (row: DisplayRow): ExportableData => {
        const exportMonths: { [key: string]: { value: number } } = {};
        MONTH_NAMES.forEach((month) => {
          exportMonths[month] = { value: row.months?.[month] || 0 };
        });

        // Prepare the base export row structure
        const exportRow: Partial<ExportableData> = {
          // Add fields required by the updated exportToCSV for summary
          market_id: "SUMMARY", // Dummy value for summary
          market_name: "Summary View", // Descriptive name
          product: row.isBrandRow ? row.brand : row.variant || "", // Use Brand or Variant name
          brand: row.brand,
          variant: row.isBrandRow ? "" : row.variant || "",
          variant_id: row.isBrandRow ? "" : row.variant_id || "",
          variant_size_pack_id: "", // Not applicable in summary
          variant_size_pack_desc: row.isBrandRow
            ? row.brand
            : row.variant || "", // Consistent with product
          forecastLogic: "aggregated", // Fixed value for summary
          months: exportMonths,
          case_equivalent_volume: row.total ?? 0, // Total TY Volume
          py_case_equivalent_volume: row.total_py_volume ?? 0, // Add Total PY Volume
          gross_sales_value: row.total_gsv_ty ?? 0, // Keep for potential future use or internal consistency
          py_gross_sales_value: row.total_gsv_py ?? 0, // Keep for potential future use
          // Include flags needed by the export function
          isBrandRow: row.isBrandRow, // Pass the flag
        };

        // Merge calculated guidance values into the export row
        if (selectedRowGuidance && selectedRowGuidance.length > 0) {
          const aggregateKey = row.isBrandRow
            ? `brand:${row.id}`
            : `variant:${row.brand}_${row.variant_id || row.variant}`;
          const rowGuidanceResults = guidanceResults[aggregateKey];

          if (rowGuidanceResults) {
            selectedRowGuidance.forEach((guidance) => {
              const guidanceKey = `guidance_${guidance.id}`;
              const calculationResult = rowGuidanceResults[guidance.id];
              // Add the calculated total to the export row using the dynamic key
              if (calculationResult && calculationResult.total !== undefined) {
                exportRow[guidanceKey] = calculationResult.total;
              }
            });
          }
        }

        return exportRow as ExportableData; // Cast to full type
      }
    );

    // Call exportToCSV - pass empty array for selectedGuidance
    exportToCSV(
      formattedData,
      [], // No columns selected currently
      true, // isSummaryView = true
      lastActualMonthIndex
    );
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
          aggregateKey={aggregateKey}
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

  const handleApplyColumns = (columns: Guidance[]) => {
    const columnIds = columns.map((col) => col.id);
    dispatch(setPendingSummaryCols(columnIds));
    setColumnsDialogOpen(false);
  };

  const handleApplyRows = (rows: Guidance[]) => {
    const rowIds = rows.map((row) => row.id);
    dispatch(setPendingSummaryRows(rowIds));
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
              <FormControl sx={{ minWidth: 300, flex: 1 }}>
                <InputLabel id="market-select-label">Filter Markets</InputLabel>
                <Select
                  labelId="market-select-label"
                  multiple
                  value={selectedMarkets}
                  onChange={handleMarketChange}
                  input={<OutlinedInput label="Filter Markets" />}
                  renderValue={(selected) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: 0.5,
                        overflow: "hidden",
                        alignItems: "flex-end",
                      }}
                    >
                      {selected.slice(0, MAX_CHIPS_VISIBLE).map((value) => {
                        const market = marketData.find(
                          (m) => m.market_id === value
                        );
                        return (
                          <Chip
                            key={value}
                            label={market ? market.market_name : value}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              borderRadius: "16px",
                              backgroundColor: "transparent",
                              flexShrink: 0,
                              "& .MuiChip-label": { px: 1 },
                            }}
                            onDelete={(e) => {
                              e.stopPropagation();
                              setSelectedMarkets((prev) =>
                                prev.filter((m) => m !== value)
                              );
                            }}
                          />
                        );
                      })}
                      {selected.length > MAX_CHIPS_VISIBLE && (
                        <Typography
                          variant="body2"
                          sx={{ pl: 0.5, flexShrink: 0, pb: 0.25 }}
                        >
                          +{selected.length - MAX_CHIPS_VISIBLE} more
                        </Typography>
                      )}
                      {selected.length === 0 && (
                        <Box sx={{ minHeight: "24px" }} />
                      )}
                    </Box>
                  )}
                  MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                >
                  {marketData.map((market) => (
                    <MenuItem key={market.market_id} value={market.market_id}>
                      {market.market_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 300, flex: 1 }}>
                <InputLabel id="brand-select-label">Filter Brands</InputLabel>
                <Select
                  labelId="brand-select-label"
                  multiple
                  value={selectedBrands}
                  onChange={handleBrandChange}
                  input={<OutlinedInput label="Filter Brands" />}
                  renderValue={(selected) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: 0.5,
                        overflow: "hidden",
                        alignItems: "flex-end",
                      }}
                    >
                      {selected.slice(0, MAX_CHIPS_VISIBLE).map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: "16px",
                            backgroundColor: "transparent",
                            flexShrink: 0,
                            "& .MuiChip-label": {
                              px: 1,
                            },
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            setSelectedBrands((prev) =>
                              prev.filter((b) => b !== value)
                            );
                          }}
                        />
                      ))}
                      {selected.length > MAX_CHIPS_VISIBLE && (
                        <Typography
                          variant="body2"
                          sx={{ pl: 0.5, flexShrink: 0, pb: 0.25 }}
                        >
                          +{selected.length - MAX_CHIPS_VISIBLE} more
                        </Typography>
                      )}
                      {selected.length === 0 && (
                        <Box sx={{ minHeight: "24px" }} />
                      )}
                    </Box>
                  )}
                  MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                >
                  {availableBrands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                loading={
                  depletionsStatus === "loading" ||
                  localCalcStatus === "calculating"
                }
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
                  depletionsStatus !== "loading" &&
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
                {depletionsStatus === "loading" ||
                  (localCalcStatus === "calculating" && (
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
                  ))}
              </Box>
            )}
          </Box>
        </Collapse>
        <GuidanceDialog
          open={columnsDialogOpen}
          onClose={() => setColumnsDialogOpen(false)}
          title="Select Summary Guidance"
          availableGuidance={availableGuidance}
          initialSelectedColumns={selectedGuidance}
          initialSelectedRows={selectedRowGuidance}
          onApplyColumns={handleApplyColumns}
          onApplyRows={handleApplyRows}
        />
      </Box>
    </Paper>
  );
};
