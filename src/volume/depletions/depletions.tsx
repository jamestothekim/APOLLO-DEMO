import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Button,
  Snackbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Typography,
  Chip,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import { DetailsContainer } from "./details/detailsContainer";
import type { MarketData } from "../volumeForecast";
import type { Benchmark } from "../components/benchmarks";
import axios from "axios";

import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import { useUser, MarketAccess } from "../../userContext";
import {
  FORECAST_OPTIONS,
  MONTH_NAMES,
  MONTH_MAPPING,
  processMonthData,
  exportToCSV,
  hasNonZeroTotal,
  calculateTotal,
  ForecastLogic,
  formatBenchmarkValue,
  recalculateBenchmarks,
  SIDEBAR_BENCHMARK_OPTIONS,
  getBenchmarkDataForSidebar,
} from "./util/depletionsUtil";

export interface ExtendedForecastData {
  id: string;
  market_id: string;
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
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  commentary?: string;
  isLoading?: boolean;
  [key: string]: any; // Allow dynamic benchmark values
}

export type FilterSelectionProps = {
  selectedMarkets: string[];
  selectedBrands: string[];
  marketMetadata: MarketData[];
  isCustomerView?: boolean;
  onUndo?: (handler: () => Promise<void>) => void;
  onExport?: (handler: () => void) => void;
  onAvailableBrandsChange?: (brands: string[]) => void;
  onAvailableMarketsChange?: (markets: string[]) => void;
  selectedBenchmarks?: Benchmark[];
};

// Add this helper function near the top with other utility functions
const fetchLoggedForecastChanges = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/redi/log-forecast-changes`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    return [];
  }
};

// Update the processRawData function to include customer info
const processRawData = (
  data: any[],
  loggedChanges: any[] = [],
  isCustomerView: boolean,
  selectedBenchmarks?: Benchmark[]
): ExtendedForecastData[] => {
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

  // Group data by market/customer and variant_size_pack_id combination
  const groupedData = data.reduce((acc: { [key: string]: any }, item: any) => {
    // Construct the key consistently with how it's done in Redis
    const key = isCustomerView
      ? `forecast:${item.customer_id}:${item.variant_size_pack_desc}:${item.customer_id}`
      : `forecast:${item.market_id}:${item.variant_size_pack_desc}`;

    if (!acc[key]) {
      acc[key] = {
        id: key, // Use the same key format as Redis
        market_id: item.market_id,
        market_name: item.market,
        customer_id: item.customer_id,
        customer_name: item.customer,
        product: item.variant_size_pack_desc,
        brand: item.brand,
        variant: item.variant,
        variant_id: item.variant_id,
        variant_size_pack_id: item.variant_size_pack_id,
        variant_size_pack_desc: item.variant_size_pack_desc,
        forecastLogic: item.forecast_method || "flat",
        months: {},
        py_case_equivalent_volume_months: {},
        // Initialize GSV values to zero
        gross_sales_value: 0,
        py_gross_sales_value: 0,
        py_case_equivalent_volume: 0,
      };

      // Initialize all months with proper actual status
      MONTH_NAMES.forEach((month, index) => {
        const shouldBeActual = hasAnyActuals && index <= lastActualMonthIndex;
        acc[key].months[month] = {
          value: 0,
          isActual: shouldBeActual,
          isManuallyModified: false,
          data_type: shouldBeActual ? "actual_complete" : "forecast",
        };
      });
    }

    // Process month data as it comes in
    const monthName = MONTH_NAMES[item.month - 1];
    if (monthName) {
      // Process current year data
      if (acc[key].months[monthName]) {
        acc[key].months[monthName].value +=
          Math.round(item.case_equivalent_volume * 100) / 100;
      } else {
        const isActual = Boolean(item.data_type?.includes("actual"));
        acc[key].months[monthName] = {
          value: Math.round(item.case_equivalent_volume * 100) / 100,
          isActual,
          isManuallyModified: item.is_manual_input || false,
          data_type: isActual ? "actual_complete" : "forecast",
        };
      }

      // Process historical (last year) data
      if (item.py_case_equivalent_volume !== undefined) {
        if (acc[key].py_case_equivalent_volume_months[monthName]) {
          acc[key].py_case_equivalent_volume_months[monthName].value +=
            Math.round(item.py_case_equivalent_volume * 100) / 100;
        } else {
          acc[key].py_case_equivalent_volume_months[monthName] = {
            value: Math.round(item.py_case_equivalent_volume * 100) / 100,
            isActual: true, // Historical data is always actual
            isManuallyModified: false,
            data_type: "actual_complete",
          };
        }
      }
    }

    // Sum up GSV values - add them to the accumulated values
    if (item.gross_sales_value !== undefined) {
      acc[key].gross_sales_value += Number(item.gross_sales_value) || 0;
    }

    if (item.py_gross_sales_value !== undefined) {
      acc[key].py_gross_sales_value += Number(item.py_gross_sales_value) || 0;
    }

    if (item.py_case_equivalent_volume !== undefined) {
      acc[key].py_case_equivalent_volume +=
        Number(item.py_case_equivalent_volume) || 0;
    }

    return acc;
  }, {});

  // Fill in any missing months with zeros for both current and historical data
  Object.values(groupedData).forEach((item: any) => {
    MONTH_NAMES.forEach((month) => {
      // Fill current year data
      if (!item.months[month]) {
        item.months[month] = {
          value: 0,
          isActual: false,
          isManuallyModified: false,
        };
      }
      // Fill historical data
      if (!item.py_case_equivalent_volume_months[month]) {
        item.py_case_equivalent_volume_months[month] = {
          value: 0,
          isActual: true,
          isManuallyModified: false,
        };
      }
    });
  });

  // Apply any logged changes
  loggedChanges.forEach((change) => {
    const key = isCustomerView
      ? `forecast:${change.customer_id}:${change.variant_size_pack_desc}:${change.customer_id}`
      : `forecast:${change.market_id}:${change.variant_size_pack_desc}`;
    if (groupedData[key]) {
      groupedData[key].forecastLogic = change.forecastType;
      groupedData[key].months = change.months;
    }
  });

  // Now calculate the derived benchmark values for each row
  if (selectedBenchmarks && selectedBenchmarks.length > 0) {
    Object.keys(groupedData).forEach((key) => {
      groupedData[key] = recalculateBenchmarks(
        groupedData[key],
        selectedBenchmarks
      );
    });
  }

  return Object.values(groupedData);
};

// Add this interface
interface UndoResponse {
  success: boolean;
  changedKey: string;
  restoredState: RestoredState | null;
  hasMoreHistory: boolean;
}

// Update interface for restored state
interface RestoredState {
  userId?: string;
  state?: string;
  market_id: string;
  market_name: string;
  market_code?: string;
  customer_id?: string;
  customer_name?: string;
  brand?: string;
  variant?: string;
  variant_id?: string;
  variant_size_pack_id?: string;
  variant_size_pack_desc: string;
  forecastType: string;
  timestamp: number;
  isManualEdit: boolean;
  comment?: string;
  key?: string;
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
}

export const Depletions: React.FC<FilterSelectionProps> = ({
  selectedMarkets,
  selectedBrands,
  marketMetadata,
  isCustomerView,
  onUndo,
  onExport,
  onAvailableBrandsChange,
  onAvailableMarketsChange,
  selectedBenchmarks,
}) => {
  const { user } = useUser();
  const theme = useTheme();
  const [forecastData, setForecastData] = useState<ExtendedForecastData[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [undoSnackbarOpen, setUndoSnackbarOpen] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [noMoreActionsSnackbarOpen, setNoMoreActionsSnackbarOpen] =
    useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    market: string;
    product: string;
    value: number;
    month: number;
    year: number;
  } | null>(null);
  const [selectedDataState, setSelectedDataState] =
    useState<ExtendedForecastData | null>(null);
  const [initialSidebarState, setInitialSidebarState] =
    useState<ExtendedForecastData | null>(null);
  const [comment, setComment] = useState("");
  const [undoHistory, setUndoHistory] = useState<
    Array<{
      timestamp: number;
      timestampFormatted: string;
      market_name: string;
      variant_size_pack_desc: string;
      forecastType: string;
      userId: string;
      distributor_name?: string;
      key: string;
      isNextUndo: boolean;
    }>
  >([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Update useEffect to reset comment when selectedComment changes
  useEffect(() => {
    setComment(selectedComment || "");
  }, [selectedComment]);

  // Update the filtered data logic
  const filteredData = useMemo(() => {
    return forecastData.filter((row) => {
      const marketMatch =
        selectedMarkets.length === 0 ||
        (isCustomerView
          ? selectedMarkets.includes(row.customer_id || "") // Use customer_id directly
          : selectedMarkets.includes(row.market_id));
      const brandMatch =
        selectedBrands.length === 0 || selectedBrands.includes(row.brand);
      return marketMatch && brandMatch;
    });
  }, [forecastData, selectedMarkets, selectedBrands, isCustomerView]);

  // Update useEffect to set available markets based on view type
  useEffect(() => {
    if (isCustomerView) {
      const customerIds = marketMetadata
        .filter((market) => market.settings?.managed_by === "Customer")
        .flatMap((market) => market.customers || [])
        .map((customer) => customer.customer_coding);
      setAvailableMarkets(customerIds);
    } else {
      const marketIds = marketMetadata
        .filter((market) => market.settings?.managed_by === "Market")
        .map((market) => market.market_id);
      setAvailableMarkets(marketIds);
    }
  }, [isCustomerView, marketMetadata]);

  // Update loadForecastData to handle customer view
  const loadForecastData = useMemo(
    () => async () => {
      try {
        // Set initial loading state by creating placeholder rows
        if (forecastData.length === 0) {
          // Only set placeholders if no data exists yet
          const placeholders = marketMetadata.slice(0, 3).map(
            (market, idx) =>
              ({
                id: `loading-${idx}`,
                market_id: market.market_id,
                market_name: market.market_name,
                product: "Loading...",
                brand: "Loading...",
                variant: "Loading...",
                variant_id: `loading-${idx}`,
                variant_size_pack_id: `loading-${idx}`,
                variant_size_pack_desc: "Loading...",
                forecastLogic: "flat",
                isLoading: true,
                months: {},
              } as ExtendedForecastData)
          );

          setForecastData(placeholders);
        }

        const allIds = isCustomerView
          ? marketMetadata
              .filter((market) => market.settings?.managed_by === "Customer")
              .flatMap((market) => market.customers || [])
              .map((customer) => customer.customer_id)
          : marketMetadata
              .filter((market) => market.settings?.managed_by === "Market")
              .map((market) => market.market_id);

        const [forecastResponse, loggedChanges] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_URL}/volume/depletions-forecast?` +
              `isMarketView=${!isCustomerView}` +
              `&markets=${JSON.stringify(
                isCustomerView
                  ? []
                  : selectedMarkets.length > 0
                  ? selectedMarkets
                  : allIds
              )}` +
              `&customers=${JSON.stringify(
                isCustomerView
                  ? selectedMarkets.length > 0
                    ? selectedMarkets
                    : allIds
                  : []
              )}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          ),
          fetchLoggedForecastChanges(),
        ]);
        console.log(forecastResponse.data);

        if (!forecastResponse.data) {
          throw new Error("Failed to fetch forecast data");
        }

        const processedData = processRawData(
          forecastResponse.data,
          loggedChanges,
          isCustomerView ?? false,
          selectedBenchmarks
        );
        const nonZeroData = processedData
          .filter(hasNonZeroTotal)
          .map((row) => ({
            ...row,
            isLoading: false,
          }));
        setForecastData(nonZeroData);

        const brands = Array.from(
          new Set(nonZeroData.map((row) => row.brand))
        ).sort();
        setAvailableBrands(brands);
      } catch (error) {
        console.error("Error loading forecast data:", error);
        // Clear loading indicators on error
        setForecastData((prevData) =>
          prevData.map((row) => ({ ...row, isLoading: false }))
        );
      }
    },
    [
      marketMetadata,
      isCustomerView,
      selectedMarkets,
      selectedBenchmarks,
      forecastData.length,
    ]
  );

  // Use loadForecastData in useEffect
  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  // Update handleUndo to handle the new history information
  const handleUndo = useCallback(async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/redi/undo-last-change`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 404) {
        setUndoMessage("No more actions to undo");
        setUndoSnackbarOpen(true);
        return;
      }

      const undoResponse: UndoResponse & { history: typeof undoHistory } =
        response.data;

      if (undoResponse.success && undoResponse.restoredState) {
        const restored = undoResponse.restoredState;

        if (undoResponse.history) {
          setUndoHistory(undoResponse.history);
        }

        setForecastData((prevData) => {
          const expectedKey = isCustomerView
            ? restored.key
            : `forecast:${restored.market_id}:${restored.variant_size_pack_desc}`;

          const updatedData = prevData.map((item) => {
            if (item.id === expectedKey) {
              // Create updated row with restored forecast logic and months
              let updatedItem = {
                ...item,
                forecastLogic: restored.forecastType,
                months: restored.months,
              };

              // Recalculate total volume
              const totalVolume = calculateTotal(restored.months);
              updatedItem.case_equivalent_volume = totalVolume;

              // Recalculate benchmarks if they exist
              if (selectedBenchmarks && selectedBenchmarks.length > 0) {
                updatedItem = recalculateBenchmarks(
                  updatedItem,
                  selectedBenchmarks
                );
              }

              return updatedItem;
            }
            return item;
          });

          return updatedData;
        });

        setUndoMessage(
          undoResponse.hasMoreHistory
            ? "Undo successful"
            : "No more actions to undo"
        );
        setUndoSnackbarOpen(true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error undoing change:", error.message);
      }
    }
  }, [
    setForecastData,
    setUndoMessage,
    setUndoSnackbarOpen,
    isCustomerView,
    selectedBenchmarks,
  ]);

  // Now the effect can safely include handleUndo in deps
  useEffect(() => {
    if (onUndo) {
      onUndo(handleUndo);
    }
  }, [onUndo, handleUndo]);

  // Update handleRowClick to use filteredData
  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    const selectedData = filteredData.find((row) => row.id === id);
    if (selectedData) {
      // Store the initial state before any modifications
      setInitialSidebarState(JSON.parse(JSON.stringify(selectedData)));
      setSelectedDataState(selectedData);
    }
  };

  // Update handleForecastChange to use recalculateBenchmarks
  const handleForecastChange = async (
    newLogic: string,
    rowData: ExtendedForecastData,
    options: {
      updateTable?: boolean;
      userId?: string | null;
    } = {}
  ) => {
    const { updateTable = false, userId } = options;

    try {
      // Set row to loading state
      if (updateTable) {
        setForecastData((prevData: ExtendedForecastData[]) =>
          prevData.map((row: ExtendedForecastData) =>
            row.id === rowData.id ? { ...row, isLoading: true } : row
          )
        );
      }

      if (selectedRow === rowData.id) {
        setSelectedDataState((prev) =>
          prev ? { ...prev, isLoading: true } : null
        );
      }

      // Store the initial state before making any changes
      const initialState = {
        userId,
        market_id: rowData.market_id,
        market_name: rowData.market_name,
        variant_size_pack_desc: rowData.variant_size_pack_desc,
        variant_size_pack_id: rowData.variant_size_pack_id,
        brand: rowData.brand,
        variant: rowData.variant,
        variant_id: rowData.variant_id,
        customer_id: rowData.customer_id,
        customer_name: rowData.customer_name,
        forecastType: rowData.forecastLogic,
        months: JSON.parse(JSON.stringify(rowData.months)),
      };

      const requestBody = {
        forecastMethod: newLogic,
        market_id: isCustomerView ? rowData.customer_id : rowData.market_id,
        variant_size_pack_desc: rowData.variant_size_pack_desc,
        isCustomerView: isCustomerView,
      };

      const forecastResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/volume/change-forecast`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!forecastResponse.data) {
        throw new Error("No data received from forecast update");
      }

      const forecastResponseData = forecastResponse.data;
      const updatedMonths = processMonthData(forecastResponseData);

      // Create base updated row with new forecast logic and months
      let updatedRow = {
        ...rowData,
        forecastLogic: newLogic,
        months: updatedMonths,
      };

      // Use the centralized function to recalculate all benchmarks
      if (selectedBenchmarks && selectedBenchmarks.length > 0) {
        updatedRow = recalculateBenchmarks(updatedRow, selectedBenchmarks);
        updatedRow.isLoading = false; // Ensure loading is false after recalculation
      }

      if (updateTable) {
        setForecastData((prevData: ExtendedForecastData[]) =>
          prevData.map((row: ExtendedForecastData) =>
            row.id === rowData.id ? updatedRow : row
          )
        );
      }

      // Always update selectedDataState if this is the selected row
      if (selectedRow === rowData.id) {
        setSelectedDataState(updatedRow);
      }

      // Only log to Redis if we have a userId
      if (userId) {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
          {
            userId,
            market_id: isCustomerView ? rowData.customer_id : rowData.market_id,
            market_name: isCustomerView
              ? rowData.customer_name
              : rowData.market_name,
            variant_size_pack_desc: rowData.variant_size_pack_desc,
            variant_size_pack_id: rowData.variant_size_pack_id,
            brand: rowData.brand,
            variant: rowData.variant,
            variant_id: rowData.variant_id,
            customer_id: isCustomerView ? rowData.customer_id : null,
            customer_name: isCustomerView ? rowData.customer_name : null,
            forecastType: newLogic,
            months: updatedMonths,
            initialState,
            isManualEdit: false,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      }

      return updatedRow;
    } catch (error) {
      console.error("Error updating forecast:", error);

      // Clear loading state on error
      if (updateTable) {
        setForecastData((prevData: ExtendedForecastData[]) =>
          prevData.map((row: ExtendedForecastData) =>
            row.id === rowData.id ? { ...row, isLoading: false } : row
          )
        );
      }

      if (selectedRow === rowData.id && selectedDataState) {
        setSelectedDataState({ ...selectedDataState, isLoading: false });
      }

      throw error;
    }
  };

  // Update handleLogicChange to ensure sidebar state is updated
  const handleLogicChange = async (
    event: SelectChangeEvent<string>,
    rowId: string
  ) => {
    event.stopPropagation();
    const newLogic = event.target.value as ForecastLogic;
    const rowData = forecastData.find((row) => row.id === rowId);

    if (!rowData) return;

    try {
      await handleForecastChange(newLogic, rowData, {
        updateTable: true,
        userId: user?.id?.toString(),
      });
    } catch (error) {
      console.error("Error in handleLogicChange:", error);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    // If "All" is selected, use -1 internally to represent showing all rows
    setRowsPerPage(value === "All" ? -1 : parseInt(value, 10));
    setPage(0);
  };

  // Update handleSidebarSave to use initialSidebarState
  const handleSidebarSave = async (editedData: ExtendedForecastData) => {
    if (!user || !initialSidebarState) return;

    try {
      // Use the initial state we captured when the sidebar was opened
      const initialState = {
        userId: user.id,
        market_id: isCustomerView
          ? initialSidebarState.customer_id
          : initialSidebarState.market_id,
        market_name: isCustomerView
          ? initialSidebarState.customer_name
          : initialSidebarState.market_name,
        variant_size_pack_desc: initialSidebarState.variant_size_pack_desc,
        variant_size_pack_id: initialSidebarState.variant_size_pack_id,
        brand: initialSidebarState.brand,
        variant: initialSidebarState.variant,
        variant_id: initialSidebarState.variant_id,
        customer_id: isCustomerView ? initialSidebarState.customer_id : null,
        customer_name: isCustomerView
          ? initialSidebarState.customer_name
          : null,
        forecastType: initialSidebarState.forecastLogic,
        months: JSON.parse(JSON.stringify(initialSidebarState.months)),
      };

      // First update the forecast
      const forecastResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/volume/change-forecast`,
        {
          forecastMethod: editedData.forecastLogic,
          market_id: isCustomerView
            ? editedData.customer_id
            : editedData.market_id,
          variant_size_pack_desc: editedData.variant_size_pack_desc,
          isCustomerView: isCustomerView,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!forecastResponse.data) {
        throw new Error("Failed to update forecast");
      }

      // Then log to Redis with the complete state
      await axios.post(
        `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
        {
          userId: user.id,
          market_id: isCustomerView
            ? editedData.customer_id
            : editedData.market_id,
          market_name: isCustomerView
            ? editedData.customer_name
            : editedData.market_name,
          variant_size_pack_desc: editedData.variant_size_pack_desc,
          variant_size_pack_id: editedData.variant_size_pack_id,
          brand: editedData.brand,
          variant: editedData.variant,
          variant_id: editedData.variant_id,
          customer_id: isCustomerView ? editedData.customer_id : null,
          customer_name: isCustomerView ? editedData.customer_name : null,
          forecastType: editedData.forecastLogic,
          months: JSON.parse(JSON.stringify(editedData.months)),
          initialState,
          isManualEdit: false,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Recalculate benchmarks if they exist
      if (selectedBenchmarks && selectedBenchmarks.length > 0) {
        editedData = recalculateBenchmarks(editedData, selectedBenchmarks);
      }

      // Update local state
      setForecastData((prevData) =>
        prevData.map((item) => (item.id === editedData.id ? editedData : item))
      );

      setSelectedRow(null);
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setCommentDialogOpen(true);
  };

  // Add this helper function near the top of the component
  const hasAnyComments = () => {
    return filteredData.some((row) => row.commentary);
  };

  const columns: Column[] = useMemo(
    () => [
      // Controls Section
      {
        key: "market",
        header: "MARKET",
        align: "left" as const,
        render: (_: any, row: ExtendedForecastData) => {
          const { user } = useUser();
          const marketInfo = user?.user_access?.Markets?.find(
            (m: MarketAccess) => m.market_code === row.market_name
          );
          return marketInfo?.market || row.market_name;
        },
      },
      // Add customer column when in customer view
      ...(isCustomerView
        ? [
            {
              key: "customer",
              header: "CUSTOMER",
              align: "left" as const,
              render: (_: any, row: ExtendedForecastData) =>
                row.customer_name || "-",
            },
          ]
        : []),
      {
        key: "product",
        header: "PRODUCT",
        align: "left" as const,
        render: (_: any, row: ExtendedForecastData) => {
          if (!row.product) return "-";
          const parts = row.product.split(" - ");
          return parts.length > 1 ? parts[1] : row.product;
        },
      },
      {
        key: "forecastLogic",
        header: "LOGIC",
        align: "left" as const,
        render: (value: string, row: ExtendedForecastData) => (
          <Select
            value={value}
            onChange={(e) => handleLogicChange(e, row.id)}
            onClick={(e) => e.stopPropagation()}
            size="small"
            sx={{ minWidth: 120, fontSize: "inherit" }}
          >
            {FORECAST_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        ),
      },
      // Total column moved here, before the month columns
      {
        key: "total",
        header: "VOL 9L",
        subHeader: "TY",
        align: "right" as const,
        render: (_: any, row: ExtendedForecastData) => {
          // Show loading indicator if the row is loading
          if (row.isLoading) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={16} thickness={4} />
              </Box>
            );
          }

          return (
            Math.round(calculateTotal(row.months) * 10) / 10
          ).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
        },
      },
      // Update benchmark columns with loading state
      ...(selectedBenchmarks?.map((benchmark) => ({
        key: `benchmark_${benchmark.id}`,
        header: benchmark.label,
        subHeader: benchmark.sublabel,
        align: "right" as const,
        render: (_: any, row: ExtendedForecastData) => {
          // Show loading indicator if the entire row is loading
          if (row.isLoading) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={16} thickness={4} />
              </Box>
            );
          }

          // For direct values, use the field name directly
          let value: number | undefined;

          if (typeof benchmark.value === "string") {
            // Use direct field
            value = row[
              benchmark.value as keyof ExtendedForecastData
            ] as number;
          } else {
            // For calculated benchmarks, use the stored result
            value = row[`benchmark_${benchmark.id}`] as number;
          }

          // Show loading indicator if value is being calculated
          if (value === undefined) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={16} thickness={4} />
              </Box>
            );
          }

          return formatBenchmarkValue(
            value,
            benchmark.calculation?.format,
            benchmark.label
          );
        },
      })) || []),
      // Month columns (Phasing section)
      ...(forecastData.length > 0
        ? MONTH_NAMES.map((month) => {
            // Find any row that has this month as actual to determine header status
            const isActualMonth = forecastData.some(
              (row) => row.months[month]?.isActual
            );

            return {
              key: `months.${month}`,
              header: month,
              subHeader: isActualMonth ? "ACT" : "FCST",
              align: "right" as const,
              render: (_: any, row: ExtendedForecastData) => {
                // Show loading indicator if the row is loading
                if (row.isLoading) {
                  return (
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress size={16} thickness={4} />
                    </Box>
                  );
                }

                if (!row?.months?.[month]) return "-";
                const data = row.months[month];
                return (
                  <div
                    onClick={(event) => {
                      if (data.isActual) {
                        event.stopPropagation();
                        // Find the market info using market_id
                        const marketInfo = marketMetadata.find(
                          (m) => m.market_id === row.market_id
                        );

                        // Get the first two characters of the market_code (e.g., "NY" from "NYU")
                        const stateCode =
                          marketInfo?.market_code?.substring(0, 2) || "";

                        // If it's a phantom actual month (value is 0 and isActual is true)
                        if (data.value === 0 && data.isActual) {
                          setSelectedDetails({
                            market: stateCode,
                            product: row.product,
                            value: -1, // Special value to indicate no data
                            month: MONTH_MAPPING[month],
                            year: 2025,
                          });
                        } else {
                          setSelectedDetails({
                            market: stateCode,
                            product: row.product,
                            value: Math.round(data.value),
                            month: MONTH_MAPPING[month],
                            year: 2025,
                          });
                        }
                        setDetailsOpen(true);
                      }
                    }}
                    style={{ position: "relative" }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: data.isActual ? "primary.main" : "inherit",
                        cursor: data.isActual ? "pointer" : "inherit",
                      }}
                    >
                      {((data.value * 10) / 10).toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </Box>
                    {data.isManuallyModified && (
                      <EditIcon
                        sx={{
                          fontSize: "0.875rem",
                          position: "absolute",
                          right: "-16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "secondary.main",
                        }}
                      />
                    )}
                  </div>
                );
              },
            };
          })
        : MONTH_NAMES.map((month) => ({
            key: `months.${month}`,
            header: month,
            subHeader: "FCST",
            align: "right" as const,
            render: () => "-",
          }))),
      ...(hasAnyComments()
        ? [
            {
              key: "commentary",
              header: "COM",
              align: "center" as const,
              render: (
                commentary: string | undefined,
                _row: ExtendedForecastData
              ) =>
                commentary ? (
                  <Box
                    onClick={(e) => handleCommentClick(e, commentary)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Tooltip title="View Comment">
                      <CommentIcon color="action" fontSize="small" />
                    </Tooltip>
                  </Box>
                ) : null,
            },
          ]
        : []),
    ],
    [
      forecastData,
      isCustomerView,
      handleLogicChange,
      marketMetadata,
      selectedBenchmarks,
    ]
  );

  const handleSaveClick = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/redi/save-changes`,
        { userId: user?.id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to save changes");
      }

      showSnackbar("Changes saved successfully", "success");
    } catch (error) {
      console.error("Error saving changes:", error);
      showSnackbar("Failed to save changes", "error");
    }
  };

  const handlePublish = () => {
    // TODO: Implement publish functionality
  };

  // Add handleExport function
  const handleExport = useCallback(() => {
    exportToCSV(forecastData, selectedBenchmarks);
  }, [forecastData, selectedBenchmarks]);

  // Register export handler
  useEffect(() => {
    if (onExport) {
      onExport(handleExport);
    }
  }, [onExport, handleExport]);

  // Add this effect to track changes
  useEffect(() => {
    if (selectedDataState) {
      const hasDataChanged =
        JSON.stringify(selectedDataState) !==
        JSON.stringify(
          forecastData.find((row) => row.id === selectedDataState.id)
        );
      setHasChanges(hasDataChanged);
    }
  }, [selectedDataState, forecastData]);

  // Add handlers for QuantSidebar
  const handleSidebarForecastChange = async (newLogic: string) => {
    if (!selectedDataState) return;

    try {
      // Don't update the table immediately, only update the sidebar state
      const updatedRow = await handleForecastChange(
        newLogic,
        selectedDataState,
        {
          updateTable: false, // Changed from true to false
          userId: null, // Don't log to Redis yet
        }
      );
      setSelectedDataState(updatedRow);
      setHasChanges(true);
    } catch (error) {
      console.error("Error in handleSidebarForecastChange:", error);
    }
  };

  // Update handleMonthValueChange to use recalculateBenchmarks
  const handleMonthValueChange = (month: string, value: string) => {
    if (!selectedDataState) return;

    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setSelectedDataState((prev) => {
      if (!prev) return null;

      // Create updated months with the new value
      const updatedMonths = {
        ...prev.months,
        [month]: {
          ...prev.months[month],
          value: Math.round(numValue * 10) / 10,
          isManuallyModified: true,
        },
      };

      // Create the base updated state
      let updatedState = {
        ...prev,
        months: updatedMonths,
      };

      // Calculate the new total volume
      const totalVolume = calculateTotal(updatedMonths);
      updatedState.case_equivalent_volume = totalVolume;

      // Use the centralized function to recalculate all benchmarks
      if (selectedBenchmarks && selectedBenchmarks.length > 0) {
        updatedState = recalculateBenchmarks(updatedState, selectedBenchmarks);
      }

      return updatedState;
    });

    setHasChanges(true);
  };

  const handleCommentaryChange = (value: string) => {
    if (!selectedDataState) return;

    setSelectedDataState((prev) =>
      prev ? { ...prev, commentary: value } : prev
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedDataState) return;

    try {
      await handleSidebarSave(selectedDataState);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  useEffect(() => {
    if (onAvailableBrandsChange) {
      onAvailableBrandsChange(availableBrands);
    }
  }, [availableBrands, onAvailableBrandsChange]);

  useEffect(() => {
    if (onAvailableMarketsChange) {
      onAvailableMarketsChange(availableMarkets);
    }
  }, [availableMarkets, onAvailableMarketsChange]);

  // Replace the existing benchmarkData useMemo with fixed types
  const sidebarBenchmarkValues = useMemo(() => {
    if (!selectedDataState) return {};
    return getBenchmarkDataForSidebar(
      selectedDataState,
      SIDEBAR_BENCHMARK_OPTIONS
    );
  }, [selectedDataState]);

  return (
    <Box>
      <DynamicTable
        data={filteredData}
        columns={columns}
        onRowClick={(row) => handleRowClick(row.id)}
        selectedRow={selectedRow}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 25, 50, { value: -1, label: "All" }]}
        stickyHeader={true}
        maxHeight="calc(100vh - 250px)"
      />

      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          mt: 3,
        }}
      >
        <Button variant="contained" color="primary" onClick={handleSaveClick}>
          Save Progress
        </Button>
        <Button variant="contained" color="secondary" onClick={handlePublish}>
          Publish
        </Button>
      </Box>

      <QuantSidebar
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Forecast Details"
        marketName={selectedDataState?.market_name}
        customerName={selectedDataState?.customer_name}
        productName={selectedDataState?.product}
        forecastLogic={selectedDataState?.forecastLogic}
        forecastOptions={FORECAST_OPTIONS}
        onForecastLogicChange={handleSidebarForecastChange}
        graphData={
          selectedDataState
            ? [
                {
                  id: "forecast",
                  label: `${
                    isCustomerView
                      ? selectedDataState.customer_name
                      : selectedDataState.market_name
                  } - ${selectedDataState.product}`,
                  data: Object.entries(selectedDataState.months).map(
                    ([month, data]) => ({
                      month,
                      value: data.value,
                    })
                  ),
                  color: theme.palette.primary.main,
                },
              ]
            : []
        }
        benchmarkForecasts={SIDEBAR_BENCHMARK_OPTIONS}
        availableBenchmarkData={sidebarBenchmarkValues}
        months={selectedDataState?.months || {}}
        onMonthValueChange={handleMonthValueChange}
        gsvRate={
          selectedDataState?.gross_sales_value
            ? selectedDataState.gross_sales_value /
              calculateTotal(selectedDataState.months)
            : undefined
        }
        commentary={selectedDataState?.commentary}
        onCommentaryChange={handleCommentaryChange}
        footerButtons={[
          {
            label: "Close",
            onClick: () => setSelectedRow(null),
            variant: "outlined",
          },
          {
            label: "Save Changes",
            onClick: handleSave,
            variant: "contained",
            disabled: !hasChanges,
          },
        ]}
      />

      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
      >
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setCommentDialogOpen(false);
              // Add your save logic here
              // For example:
              // handleSaveComment(comment);
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {selectedDetails && (
        <DetailsContainer
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          market={selectedDetails.market}
          product={selectedDetails.product}
          value={selectedDetails.value}
          month={selectedDetails.month}
          year={selectedDetails.year}
        />
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={noMoreActionsSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setNoMoreActionsSnackbarOpen(false)}
        message="No actions left to undo"
      />

      <Snackbar
        open={undoSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setUndoSnackbarOpen(false)}
        message={undoMessage}
      />

      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Forecast Change History</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {undoHistory.map((entry) => (
              <Box
                key={entry.timestamp}
                sx={{
                  p: 2,
                  mb: 1,
                  border: "1px solid",
                  borderColor: entry.isNextUndo ? "primary.main" : "divider",
                  borderRadius: 1,
                  bgcolor: entry.isNextUndo
                    ? "primary.light"
                    : "background.paper",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="subtitle1">
                    {entry.market_name} - {entry.variant_size_pack_desc}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Forecast Type: {entry.forecastType}
                  </Typography>
                  {entry.distributor_name && (
                    <Typography variant="body2">
                      Customer: {entry.distributor_name}
                    </Typography>
                  )}
                  <Typography variant="body2">User: {entry.userId}</Typography>
                </Box>
                {entry.isNextUndo && (
                  <Box sx={{ mt: 1 }}>
                    <Chip label="Next Undo" color="primary" size="small" />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
