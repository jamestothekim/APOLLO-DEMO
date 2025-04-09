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
  useTheme,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import { DetailsContainer } from "./details/detailsContainer";
import type { MarketData } from "../volumeForecast";
import type { Guidance } from "../components/guidance";
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
  formatGuidanceValue,
  recalculateGuidance,
  SIDEBAR_BENCHMARK_OPTIONS,
  getGuidanceDataForSidebar,
} from "./util/depletionsUtil";
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";

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
  selectedGuidance?: Guidance[];
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
  selectedGuidance?: Guidance[]
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
      if (change.comment) {
        groupedData[key].commentary = change.comment;
      }
    }
  });

  // Now calculate the derived benchmark values for each row
  if (selectedGuidance && selectedGuidance.length > 0) {
    Object.keys(groupedData).forEach((key) => {
      groupedData[key] = recalculateGuidance(
        groupedData[key],
        selectedGuidance
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
  selectedGuidance,
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
          selectedGuidance
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
      selectedGuidance,
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

      const undoResponse: UndoResponse = response.data;

      if (undoResponse.success && undoResponse.restoredState) {
        const restored = undoResponse.restoredState;

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
              if (selectedGuidance && selectedGuidance.length > 0) {
                updatedItem = recalculateGuidance(
                  updatedItem,
                  selectedGuidance
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
    selectedGuidance,
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

  // Update handleForecastChange to use recalculateGuidance
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
      if (selectedGuidance && selectedGuidance.length > 0) {
        updatedRow = recalculateGuidance(updatedRow, selectedGuidance);
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
            comment: rowData.commentary || null,
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
          comment: editedData.commentary || null,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Recalculate benchmarks if they exist
      if (selectedGuidance && selectedGuidance.length > 0) {
        editedData = recalculateGuidance(editedData, selectedGuidance);
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
    setComment(commentary || "");
    setCommentDialogOpen(true);
  };

  // Add this helper function near the top of the component
  const hasAnyComments = () => {
    return filteredData.some((row) => row.commentary);
  };

  const handleCommentaryChange = (value: string) => {
    if (!selectedDataState) return;

    setSelectedDataState((prev) =>
      prev ? { ...prev, commentary: value } : prev
    );
    setHasChanges(true);
  };

  const handleSidebarSaveChanges = async () => {
    if (!selectedDataState) return;

    try {
      // If there's a comment in the dialog, update the selectedDataState
      if (commentDialogOpen && comment) {
        setSelectedDataState((prev) =>
          prev ? { ...prev, commentary: comment } : prev
        );
      }

      await handleSidebarSave(selectedDataState);
      setHasChanges(false);
      setCommentDialogOpen(false);
      showSnackbar("Changes saved successfully", "success");
    } catch (error) {
      console.error("Error saving changes:", error);
      showSnackbar("Failed to save changes", "error");
    }
  };

  const columns: Column[] = useMemo(
    () => [
      // Control section
      {
        key: "control_section",
        header: "CONTROL",
        columnGroup: true,
        columns: [
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
            extraWide: true,
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
            sx: { borderRight: "1px solid rgba(224, 224, 224, 1)" },
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
        ],
      },
      // Analytics section
      {
        key: "guidance_section",
        header: "GUIDANCE",
        columnGroup: true,
        columns: [
          {
            key: "total",
            header: "VOL 9L",
            subHeader: "TY",
            align: "right" as const,
            render: (_: any, row: ExtendedForecastData) => {
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
          ...(selectedGuidance?.map((benchmark, index, array) => ({
            key: `benchmark_${benchmark.id}`,
            header: benchmark.label,
            subHeader: benchmark.sublabel,
            align: "right" as const,
            sx:
              index === array.length - 1
                ? { borderRight: "1px solid rgba(224, 224, 224, 1)" }
                : undefined,
            render: (_: any, row: ExtendedForecastData) => {
              if (row.isLoading) {
                return (
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress size={16} thickness={4} />
                  </Box>
                );
              }

              let value: number | undefined;

              if (typeof benchmark.value === "string") {
                value = row[
                  benchmark.value as keyof ExtendedForecastData
                ] as number;
              } else {
                value = row[`benchmark_${benchmark.id}`] as number;
              }

              if (value === undefined) {
                return (
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <CircularProgress size={16} thickness={4} />
                  </Box>
                );
              }

              return formatGuidanceValue(
                value,
                benchmark.calculation?.format,
                benchmark.label
              );
            },
          })) || []),
        ],
      },
      // Phasing section
      {
        key: "months_section",
        header: "PHASING",
        columnGroup: true,
        columns: [
          ...MONTH_NAMES.map((month) => {
            const isActualMonth = forecastData.some(
              (row) => row.months[month]?.isActual
            );

            return {
              key: `months.${month}`,
              header: month,
              subHeader: isActualMonth ? "ACT" : "FCST",
              align: "right" as const,
              render: (_: any, row: ExtendedForecastData) => {
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
                  <div style={{ position: "relative" }}>
                    <Box
                      component="span"
                      sx={{
                        color: data.isActual ? "primary.main" : "inherit",
                        cursor: data.isActual ? "pointer" : "inherit",
                      }}
                      onClick={(event) => {
                        if (data.isActual) {
                          event.stopPropagation();
                          const marketInfo = marketMetadata.find(
                            (m) => m.market_id === row.market_id
                          );
                          const stateCode =
                            marketInfo?.market_code?.substring(0, 2) || "";

                          if (data.value === 0 && data.isActual) {
                            setSelectedDetails({
                              market: stateCode,
                              product: row.product,
                              value: -1,
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
          }),
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
                          <IconButton
                            size="small"
                            onClick={(e) => handleCommentClick(e, commentary)}
                          >
                            <CommentIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : null,
                },
              ]
            : []),
        ],
      },
    ],
    [
      forecastData,
      filteredData,
      isCustomerView,
      handleLogicChange,
      marketMetadata,
      selectedGuidance,
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
    exportToCSV(forecastData, selectedGuidance);
  }, [forecastData, selectedGuidance]);

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

  // Update handleMonthValueChange to use recalculateGuidance
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
      if (selectedGuidance && selectedGuidance.length > 0) {
        updatedState = recalculateGuidance(updatedState, selectedGuidance);
      }

      return updatedState;
    });

    setHasChanges(true);
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
  const sidebarGuidanceValues = useMemo(() => {
    if (!selectedDataState) return {};
    return getGuidanceDataForSidebar(
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
        maxHeight="calc(100vh)"
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
          <SaveIcon sx={{ mr: 1 }} />
          Save Progress
        </Button>
        <Button variant="contained" color="secondary" onClick={handlePublish}>
          <PublishIcon sx={{ mr: 1 }} />
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
        availableGuidanceData={sidebarGuidanceValues}
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
            label: "Apply Changes",
            onClick: handleSidebarSaveChanges,
            variant: "contained",
            disabled: !hasChanges,
          },
        ]}
      />

      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>View Comment</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={4}
            value={comment}
            fullWidth
            InputProps={{
              readOnly: true,
              sx: { backgroundColor: "action.hover" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Close</Button>
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
    </Box>
  );
};
