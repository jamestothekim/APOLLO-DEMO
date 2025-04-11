import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import {
  exportToCSV,
  MONTH_NAMES,
  formatGuidanceValue,
  Guidance,
  ExportableData,
} from "./depletions/util/depletionsUtil";
import type { MarketData } from "./volumeForecast";
import { useUser } from "../userContext";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Toolbox } from "./components/toolbox";
import { GuidanceDialog } from "./components/guidance";
import { LineChart } from "@mui/x-charts";
import axios from "axios";

interface SummaryVariantAggregateData {
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

interface SummaryBrandAggregateData {
  id: string;
  brand: string;
  months: { [key: string]: number };
  total: number;
  total_py_volume: number;
  total_gsv_ty: number;
  total_gsv_py: number;
  [key: string]: any;
}

interface DisplayRow
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
  onLoadingComplete?: () => void;
}

export const Summary = ({ onLoadingComplete }: SummaryProps) => {
  const { user, updateUserSettings } = useUser();
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewType, setViewType] = useState<"table" | "graph">("table");
  const theme = useTheme();
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    DEFAULT_SELECTED_BRANDS
  );
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedGuidance, setSelectedGuidance] = useState<Guidance[]>([]);
  const [availableGuidance, setAvailableGuidance] = useState<Guidance[]>([]);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const prefsLoadedRef = useRef(false);
  const [selectedRowGuidanceState, setSelectedRowGuidanceState] = useState<
    Guidance[]
  >([]);

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

  const MAX_CHIPS_VISIBLE = 3; // Define how many chips to show

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsBrandsLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/volume/brands`
        );
        setAvailableBrands(response.data);
      } catch (error) {
        console.error("Error loading brands:", error);
      } finally {
        setIsBrandsLoading(false);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchMarketData = async () => {
      if (!user?.user_access?.Markets?.length) return;
      try {
        const userMarketIds = user.user_access.Markets.map((m) => m.id);
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL
          }/volume/get-markets?ids=${userMarketIds.join(",")}`
        );
        setMarketData(response.data);
      } catch (error) {
        console.error("Error loading market data:", error);
      }
    };
    fetchMarketData();
  }, [user]);

  useEffect(() => {
    const fetchGuidanceOptions = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/util/get-benchmarks`
        );
        setAvailableGuidance(response.data);
      } catch (error) {
        console.error("Error fetching guidance options:", error);
      }
    };
    fetchGuidanceOptions();
  }, []);

  useEffect(() => {
    if (
      !prefsLoadedRef.current &&
      availableGuidance.length > 0 &&
      user?.user_settings
    ) {
      const { guidance_columns, guidance_rows } = user.user_settings;
      if (guidance_columns && Array.isArray(guidance_columns)) {
        const userSelectedColumns = guidance_columns
          .map((id) => availableGuidance.find((g) => g.id === id))
          .filter(Boolean) as Guidance[];
        setSelectedGuidance(userSelectedColumns);
      }
      if (guidance_rows && Array.isArray(guidance_rows)) {
        const userSelectedRows = guidance_rows
          .map((id) => availableGuidance.find((g) => g.id === id))
          .filter(Boolean) as Guidance[];
        setSelectedRowGuidanceState(userSelectedRows);
      }
      prefsLoadedRef.current = true;
    }
  }, [availableGuidance, user?.user_settings]);

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const marketsParam =
          selectedMarkets.length > 0 ? JSON.stringify(selectedMarkets) : null;

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/volume/depletions-forecast`,
          {
            params: {
              isMarketView: true,
              markets: marketsParam,
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const fetchedData: any[] = response.data;

        const rawForecastData = fetchedData.filter(
          (row) =>
            selectedBrands.length === 0 || selectedBrands.includes(row.brand)
        );

        const variantAggregation: {
          [variantKey: string]: SummaryVariantAggregateData;
        } = {};

        rawForecastData.forEach((row) => {
          const brand = row.brand;
          const variantName = row.variant;
          const variantId = row.variant_id;
          if (!brand || !variantName) return;

          const variantKey = variantId
            ? `${brand}_${variantId}`
            : `${brand}_${variantName}`;
          const monthIndex = row.month;
          const volume = Number(row.case_equivalent_volume) || 0;
          const py_volume = Number(row.py_case_equivalent_volume) || 0;
          const gsv_ty = Number(row.gross_sales_value) || 0;
          const gsv_py = Number(row.py_gross_sales_value) || 0;
          if (monthIndex < 1 || monthIndex > 12) return;
          const monthName = MONTH_NAMES[monthIndex - 1];

          if (!variantAggregation[variantKey]) {
            variantAggregation[variantKey] = {
              id: variantKey,
              brand: brand,
              variant_id: variantId,
              variant: variantName,
              months: MONTH_NAMES.reduce((acc, m) => {
                acc[m] = 0;
                return acc;
              }, {} as any),
              total: 0,
              months_py_volume: MONTH_NAMES.reduce((acc, m) => {
                acc[m] = 0;
                return acc;
              }, {} as any),
              total_py_volume: 0,
              months_gsv_ty: MONTH_NAMES.reduce((acc, m) => {
                acc[m] = 0;
                return acc;
              }, {} as any),
              total_gsv_ty: 0,
              months_gsv_py: MONTH_NAMES.reduce((acc, m) => {
                acc[m] = 0;
                return acc;
              }, {} as any),
              total_gsv_py: 0,
            };
          }
          variantAggregation[variantKey].months[monthName] += volume;
          variantAggregation[variantKey].months_py_volume[monthName] +=
            py_volume;
          variantAggregation[variantKey].months_gsv_ty[monthName] += gsv_ty;
          variantAggregation[variantKey].months_gsv_py[monthName] += gsv_py;
        });

        let variantsAggregateArray = Object.values(variantAggregation)
          .map((variantAggRow: SummaryVariantAggregateData) => {
            variantAggRow.total = Object.values(variantAggRow.months).reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            variantAggRow.total_py_volume = Object.values(
              variantAggRow.months_py_volume
            ).reduce((sum: number, val: number) => sum + val, 0);
            variantAggRow.total_gsv_ty = Object.values(
              variantAggRow.months_gsv_ty
            ).reduce((sum: number, val: number) => sum + val, 0);
            variantAggRow.total_gsv_py = Object.values(
              variantAggRow.months_gsv_py
            ).reduce((sum: number, val: number) => sum + val, 0);

            selectedGuidance.forEach((benchmark) => {
              const benchmarkKey = `benchmark_${benchmark.id}`;
              let result: number | undefined = undefined;

              const getValue = (fieldName: string): number => {
                if (fieldName === "case_equivalent_volume")
                  return variantAggRow.total;
                if (fieldName === "py_case_equivalent_volume")
                  return variantAggRow.total_py_volume;
                if (fieldName === "gross_sales_value")
                  return variantAggRow.total_gsv_ty;
                if (fieldName === "py_gross_sales_value")
                  return variantAggRow.total_gsv_py;
                console.warn(
                  `Unknown field name in benchmark calculation: ${fieldName}`
                );
                return 0;
              };

              if (typeof benchmark.value === "string") {
                result = getValue(benchmark.value);
              } else {
                const valueDef = benchmark.value as {
                  expression?: string;
                  numerator?: string;
                  denominator?: string;
                };
                const calcType = benchmark.calculation.type;

                if (calcType === "difference" && valueDef.expression) {
                  const parts = valueDef.expression.split(" - ");
                  result =
                    getValue(parts[0]?.trim()) - getValue(parts[1]?.trim());
                } else if (
                  calcType === "percentage" &&
                  valueDef.numerator &&
                  valueDef.denominator
                ) {
                  const numParts = valueDef.numerator.split(" - ");
                  const numerator =
                    getValue(numParts[0]?.trim()) -
                    getValue(numParts[1]?.trim());
                  const denominator = getValue(valueDef.denominator.trim());
                  result = denominator === 0 ? 0 : numerator / denominator;
                }
              }
              variantAggRow[benchmarkKey] = result;
            });

            MONTH_NAMES.forEach((month) => {
              variantAggRow.months[month] = Math.round(
                variantAggRow.months[month]
              );
              variantAggRow.months_py_volume[month] = Math.round(
                variantAggRow.months_py_volume[month]
              );
              variantAggRow.months_gsv_ty[month] =
                Math.round(variantAggRow.months_gsv_ty[month] * 100) / 100;
              variantAggRow.months_gsv_py[month] =
                Math.round(variantAggRow.months_gsv_py[month] * 100) / 100;
            });
            variantAggRow.total = Math.round(variantAggRow.total);
            variantAggRow.total_py_volume = Math.round(
              variantAggRow.total_py_volume
            );
            variantAggRow.total_gsv_ty =
              Math.round(variantAggRow.total_gsv_ty * 100) / 100;
            variantAggRow.total_gsv_py =
              Math.round(variantAggRow.total_gsv_py * 100) / 100;

            return variantAggRow;
          })
          .sort(
            (a: SummaryVariantAggregateData, b: SummaryVariantAggregateData) =>
              a.variant.localeCompare(b.variant)
          );

        setVariantAggregateData(variantsAggregateArray);

        const brandAggregatesMap = new Map<string, SummaryBrandAggregateData>();
        variantsAggregateArray.forEach((variantAggRow) => {
          const brand = variantAggRow.brand;
          if (!brandAggregatesMap.has(brand)) {
            brandAggregatesMap.set(brand, {
              id: brand,
              brand: brand,
              months: MONTH_NAMES.reduce((acc, m) => {
                acc[m] = 0;
                return acc;
              }, {} as any),
              total: 0,
              total_py_volume: 0,
              total_gsv_ty: 0,
              total_gsv_py: 0,
            });
          }
          const brandAgg = brandAggregatesMap.get(brand)!;
          MONTH_NAMES.forEach((month) => {
            brandAgg.months[month] += variantAggRow.months[month];
          });
          brandAgg.total += variantAggRow.total;
          brandAgg.total_py_volume += variantAggRow.total_py_volume;
          brandAgg.total_gsv_ty += variantAggRow.total_gsv_ty;
          brandAgg.total_gsv_py += variantAggRow.total_gsv_py;
        });

        brandAggregatesMap.forEach((brandAgg) => {
          selectedGuidance.forEach((benchmark) => {
            const benchmarkKey = `benchmark_${benchmark.id}`;
            let result: number | undefined = undefined;

            const getValue = (fieldName: string): number => {
              if (fieldName === "case_equivalent_volume") return brandAgg.total;
              if (fieldName === "py_case_equivalent_volume")
                return brandAgg.total_py_volume;
              if (fieldName === "gross_sales_value")
                return brandAgg.total_gsv_ty;
              if (fieldName === "py_gross_sales_value")
                return brandAgg.total_gsv_py;
              console.warn(
                `Unknown field name in benchmark calculation: ${fieldName}`
              );
              return 0;
            };

            if (typeof benchmark.value === "string") {
              result = getValue(benchmark.value);
            } else {
              const valueDef = benchmark.value as {
                expression?: string;
                numerator?: string;
                denominator?: string;
              };
              const calcType = benchmark.calculation.type;

              if (calcType === "difference" && valueDef.expression) {
                const parts = valueDef.expression.split(" - ");
                result =
                  getValue(parts[0]?.trim()) - getValue(parts[1]?.trim());
              } else if (
                calcType === "percentage" &&
                valueDef.numerator &&
                valueDef.denominator
              ) {
                const numParts = valueDef.numerator.split(" - ");
                const numerator =
                  getValue(numParts[0]?.trim()) - getValue(numParts[1]?.trim());
                const denominator = getValue(valueDef.denominator.trim());
                result = denominator === 0 ? 0 : numerator / denominator;
              }
            }
            brandAgg[benchmarkKey] = result;
          });
          brandAgg.total_gsv_ty = Math.round(brandAgg.total_gsv_ty * 100) / 100;
          brandAgg.total_gsv_py = Math.round(brandAgg.total_gsv_py * 100) / 100;
        });

        setBrandLevelAggregates(brandAggregatesMap);
      } catch (error) {
        console.error("Error fetching summary data:", error);
        setVariantAggregateData([]);
        setBrandLevelAggregates(new Map());
      } finally {
        setIsDataLoading(false);
        onLoadingComplete?.();
      }
    };

    fetchData();
  }, [
    selectedMarkets,
    selectedBrands,
    selectedGuidance,
    onLoadingComplete,
    user,
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
    const sortedBrands = Array.from(brandLevelAggregates.keys()).sort();

    sortedBrands.forEach((brand) => {
      const brandAgg = brandLevelAggregates.get(brand);
      if (brandAgg) {
        // Add Brand Row (temporary)
        const brandRow: DisplayRow = {
          ...brandAgg,
          isBrandRow: true,
          level: 0,
        };
        let brandHasVisibleChildren = false; // Flag to track if any child has non-zero volume

        // Add Variant Aggregate Rows if Brand is Expanded
        const variantRows: DisplayRow[] = [];
        if (expandedBrandIds.has(brand)) {
          const variantsForBrand = variantAggregateData
            .filter((v) => v.brand === brand)
            .sort((a, b) => a.variant.localeCompare(b.variant));

          variantsForBrand.forEach((variantAgg) => {
            // Only add variant row if its total volume is non-zero
            if (Math.abs(variantAgg.total) > 0.001) {
              // Check if total is non-zero (with tolerance)
              variantRows.push({ ...variantAgg, isBrandRow: false, level: 1 });
              brandHasVisibleChildren = true; // Mark that the brand has at least one visible child
            }
          });
        }

        // Only add the Brand Row if its total is non-zero OR if it has visible children when expanded
        if (
          Math.abs(brandRow.total) > 0.001 ||
          (expandedBrandIds.has(brand) && brandHasVisibleChildren)
        ) {
          rows.push(brandRow); // Add the brand row
          rows.push(...variantRows); // Add the filtered variant rows
        }
      }
    });
    // Final filter to ensure no zero-total rows remain (belt-and-suspenders, might be redundant after above logic)
    return rows.filter((row) => Math.abs(row.total) > 0.001);
  }, [brandLevelAggregates, variantAggregateData, expandedBrandIds]);

  const columns: Column[] = useMemo(() => {
    const hasRowGuidance =
      selectedRowGuidanceState && selectedRowGuidanceState.length > 0;

    // Brand / Variant Column
    const brandColumn: Column = {
      key: "brand",
      header: "BRAND / VARIANT",
      align: "left",
      sortable: false,
      extraWide: true,
      render: (_value: any, row: DisplayRow) => {
        const isExpanded = expandedBrandIds.has(row.id);
        return (
          <Box
            sx={{ display: "flex", alignItems: "center", pl: row.level * 2 }}
          >
            {row.isBrandRow && (
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
              sx={{ fontWeight: row.isBrandRow ? "bold" : "normal" }}
            >
              {row.isBrandRow ? row.brand : row.variant}
            </Typography>
          </Box>
        );
      },
    };

    // TY Volume Column
    const tyVolColumn: Column = {
      key: "total",
      header: "VOL 9L",
      subHeader: "TY",
      align: "right" as const,
      sortable: false,
      render: (value: number) => value?.toLocaleString() ?? "0",
    };

    // Benchmark Columns
    const benchmarkColumns: Column[] = selectedGuidance.map(
      (benchmark): Column => ({
        key: `benchmark_${benchmark.id}`,
        header: benchmark.label,
        subHeader: benchmark.sublabel,
        align: "right" as const,
        sortable: false,
        sx: {
          minWidth: 90,
        },
        render: (_value: any, row: DisplayRow) =>
          formatGuidanceValue(
            row[`benchmark_${benchmark.id}`],
            benchmark.calculation.format,
            benchmark.label
          ),
      })
    );

    // Row Guidance Column (created conditionally)
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
                    visibility: "hidden",
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

    // Month Columns
    const monthColumns: Column[] = MONTH_NAMES.map(
      (month): Column => ({
        key: `months.${month}`,
        header: month,
        align: "right" as const,
        sortable: false,
        render: (_value: any, row: DisplayRow) =>
          row.months?.[month]?.toLocaleString() ?? "0",
      })
    );

    // --- Assemble Columns in Order ---
    let combinedColumns = [
      brandColumn,
      tyVolColumn,
      ...benchmarkColumns, // Add all benchmark columns
    ];

    // Add row guidance column *after* benchmarks if it exists
    if (rowGuidanceColumn) {
      combinedColumns.push(rowGuidanceColumn);
    }

    // Add month columns at the end
    combinedColumns.push(...monthColumns);
    // ----------------------------------

    // Apply right border to the last column *before* the months start
    // This will now be the Row Guidance column if present, otherwise the last Benchmark column
    const lastValueColIndex =
      1 + selectedGuidance.length + (rowGuidanceColumn ? 1 : 0); // Index of the last non-month column (0-based)
    if (
      lastValueColIndex >= 0 &&
      lastValueColIndex < combinedColumns.length - MONTH_NAMES.length
    ) {
      // Ensure index is valid and not a month column
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
    selectedGuidance,
    selectedRowGuidanceState,
    expandedBrandIds,
    expandedGuidanceRowIds,
    handleBrandExpandClick,
    handleGuidanceExpandClick,
  ]);

  const handleColumns = () => setColumnsDialogOpen(true);

  const handleApplyColumns = async (columns: Guidance[]) => {
    const newSelectedGuidance = columns || [];
    setSelectedGuidance(newSelectedGuidance);
    setColumnsDialogOpen(false);

    if (user && updateUserSettings) {
      try {
        const columnIds = newSelectedGuidance.map((col) => col.id);
        await updateUserSettings({ guidance_columns: columnIds });
      } catch (error) {
        console.error("Error saving column guidance preferences:", error);
      }
    } else {
      console.warn(
        "User or updateUserSettings function not available. Cannot save preferences."
      );
    }
  };

  const handleApplyRows = async (rows: Guidance[]) => {
    const newSelectedRows = rows || [];
    setSelectedRowGuidanceState(newSelectedRows);
    setColumnsDialogOpen(false);

    if (user && updateUserSettings) {
      try {
        const rowIds = newSelectedRows.map((row) => row.id);
        await updateUserSettings({ guidance_rows: rowIds });
      } catch (error) {
        console.error("Error saving row guidance preferences:", error);
      }
    } else {
      console.warn("User or updateUserSettings function not available.");
    }
  };

  const dummyUndo = async () => {
    return Promise.resolve();
  };

  const handleExport = () => {
    if (!displayData || displayData.length === 0) {
      console.warn("No data available to export.");
      // Optionally show a snackbar message to the user
      return;
    }

    // Map displayData (which contains both brand and variant rows) to ExportableData
    const formattedData: ExportableData[] = displayData.map(
      (row: DisplayRow) => {
        const exportMonths: { [key: string]: { value: number } } = {};
        MONTH_NAMES.forEach((month) => {
          // Use optional chaining as months might be missing in edge cases (though unlikely)
          exportMonths[month] = { value: row.months?.[month] || 0 };
        });

        // Extract benchmark values
        const benchmarkValues: { [key: string]: any } = {};
        selectedGuidance.forEach((benchmark) => {
          const benchmarkKey = `benchmark_${benchmark.id}`;
          // Use optional chaining as benchmarks might not be calculated for all rows
          benchmarkValues[benchmarkKey] = row[benchmarkKey as keyof DisplayRow];
        });

        // Base structure for export
        const exportRow: ExportableData = {
          // Using placeholders as market context isn't directly on each row
          market_id: "SUMMARY",
          market_name: "Summary View",
          product: row.isBrandRow
            ? "Brand Total"
            : row.variant || "Variant Total", // Use variant name
          brand: row.brand,
          variant: row.isBrandRow ? "" : row.variant || "", // Variant name for variant rows
          variant_id: row.isBrandRow ? "" : row.variant_id || "", // Use variant_id if available
          variant_size_pack_id: "", // Not relevant at this aggregation level
          variant_size_pack_desc: row.isBrandRow
            ? "Brand Total"
            : row.variant || "Variant Total", // Display name
          // forecastLogic: row.forecastLogic || "unknown", // Forecast logic isn't stored per row here
          forecastLogic: "aggregated", // Use a placeholder
          months: exportMonths,
          // Use optional chaining and nullish coalescing for potentially missing fields
          case_equivalent_volume: row.total ?? 0,
          py_case_equivalent_volume: row.total_py_volume ?? 0,
          gross_sales_value: row.total_gsv_ty ?? 0,
          py_gross_sales_value: row.total_gsv_py ?? 0,
          ...benchmarkValues,
        };

        return exportRow;
      }
    );

    // Call the existing utility function
    exportToCSV(formattedData, selectedGuidance);
  };

  const series = useMemo(() => {
    // Convert Map to array for mapping and consistent ordering
    const brandDataArray = Array.from(brandLevelAggregates.values()).sort(
      (a, b) => a.brand.localeCompare(b.brand)
    );

    return brandDataArray.map((brandAgg, index) => {
      const colors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.info.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        "#FFC107", // Amber
        "#4CAF50", // Green
        "#2196F3", // Blue
        "#9C27B0", // Purple
        "#FF5722", // Deep Orange
        "#795548", // Brown
        "#607D8B", // Blue Grey
        "#E91E63", // Pink
      ];
      return {
        label: brandAgg.brand, // Use brand name as label
        data: MONTH_NAMES.map((month) => brandAgg.months?.[month] || 0), // Use aggregated brand monthly data
        color: colors[index % colors.length],
      };
    });
  }, [brandLevelAggregates, theme]);

  const calculateSummaryRowGuidanceMonthlyData = (
    row: DisplayRow,
    guidance: Guidance
  ): { [month: string]: number } | null => {
    const getMonthlyValue = (fieldName: string, month: string): number => {
      const monthlyDataSourceKey = `${fieldName}_months` as keyof DisplayRow;
      const monthlySource = row[monthlyDataSourceKey] as
        | { [key: string]: { value: number } }
        | undefined;

      if (monthlySource?.[month] !== undefined) {
        return monthlySource[month]?.value || 0;
      }

      if (fieldName === "case_equivalent_volume")
        return row.months?.[month] ?? 0;
      if (fieldName === "py_case_equivalent_volume")
        return row.months_py_volume?.[month] ?? 0;
      if (fieldName === "gross_sales_value")
        return row.months_gsv_ty?.[month] ?? 0;
      if (fieldName === "py_gross_sales_value")
        return row.months_gsv_py?.[month] ?? 0;

      console.warn(
        `Monthly breakdown for ${fieldName} not directly available on ${
          row.isBrandRow ? "Brand" : "Variant"
        } row ${row.id}. Falling back to 0.`
      );
      return 0;
    };

    const resultMonthlyData: { [month: string]: number } = {};
    if (typeof guidance.value === "string") {
      MONTH_NAMES.forEach((month) => {
        resultMonthlyData[month] = getMonthlyValue(
          guidance.value as string,
          month
        );
      });
      return resultMonthlyData;
    }
    const valueDef = guidance.value as {
      expression?: string;
      numerator?: string;
      denominator?: string;
    };
    const calcType = guidance.calculation.type;
    if (calcType === "difference" && valueDef.expression) {
      const parts = valueDef.expression.split(" - ");
      MONTH_NAMES.forEach((month) => {
        const value1 = getMonthlyValue(parts[0]?.trim(), month);
        const value2 = getMonthlyValue(parts[1]?.trim(), month);
        resultMonthlyData[month] = value1 - value2;
      });
      return resultMonthlyData;
    } else if (
      calcType === "percentage" &&
      valueDef.numerator &&
      valueDef.denominator
    ) {
      const numParts = valueDef.numerator.split(" - ");
      const denomField = valueDef.denominator.trim();
      MONTH_NAMES.forEach((month) => {
        const numerValue1 = getMonthlyValue(numParts[0]?.trim(), month);
        const numerValue2 = getMonthlyValue(numParts[1]?.trim(), month);
        const denomValue = getMonthlyValue(denomField, month);
        const numerator = numerValue1 - numerValue2;
        resultMonthlyData[month] =
          denomValue === 0 ? 0 : numerator / denomValue;
      });
      return resultMonthlyData;
    }
    return null;
  };

  const renderExpandedRowContent = (
    row: DisplayRow,
    flatColumns: Column[]
  ): React.ReactNode => {
    if (!selectedRowGuidanceState || selectedRowGuidanceState.length === 0) {
      return null;
    }

    const rowData = row;

    const guidanceData = selectedRowGuidanceState
      .map((guidance) => ({
        guidance,
        monthlyData: calculateSummaryRowGuidanceMonthlyData(rowData, guidance),
      }))
      .filter(
        (
          item
        ): item is {
          guidance: Guidance;
          monthlyData: { [month: string]: number };
        } => item.monthlyData !== null
      );

    if (guidanceData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={flatColumns.length} align="center">
            <Typography variant="caption">
              No applicable row guidance data.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    const cellPaddingSx = { py: "6px", px: "16px", borderBottom: 0 };
    const labelColumnKey = "row_guidance_label";

    return guidanceData.map(({ guidance, monthlyData }) => (
      <TableRow
        key={`${row.id}-${guidance.id}`}
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
            const value = monthlyData[month];
            cellContent = formatGuidanceValue(
              value,
              guidance.calculation.format
            );
          }

          return (
            <TableCell
              key={`${row.id}-${guidance.id}-${col.key}`}
              align={col.align || "left"}
              sx={{ ...col.sx, ...cellPaddingSx }}
            >
              {cellContent}
            </TableCell>
          );
        })}
      </TableRow>
    ));
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
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
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
                  disabled={isBrandsLoading}
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
                onUndo={dummyUndo}
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

            {isDataLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : viewType === "table" ? (
              <DynamicTable
                data={displayData}
                columns={columns}
                loading={isDataLoading}
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
              <Box sx={{ width: "100%", height: 400, p: 2 }}>
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
                  <Typography
                    sx={{ textAlign: "center", color: "text.secondary", mt: 4 }}
                  >
                    No data available for the selected filters.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
      <GuidanceDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        title="Select Guidance Columns"
        onApplyColumns={handleApplyColumns}
        onApplyRows={handleApplyRows}
      />
    </Paper>
  );
};
