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
  Typography,
  TableRow,
  TableCell,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import { DetailsContainer } from "./details/detailsContainer";
import type { MarketData } from "../volumeForecast";
// Import Guidance from the canonical source in the Redux slice
import type { Guidance } from "../../redux/guidance/guidanceSlice";
import axios from "axios";

// --- Redux Imports ---
import { useDispatch, useSelector } from "react-redux";
import { triggerSync } from "../../redux/slices/syncSlice"; // Import the action creator
import type { AppDispatch } from "../../redux/store"; // Added RootState
import {
  selectRawVolumeData, // Added import
  selectVolumeDataStatus, // Added import
  selectCustomerRawVolumeData,
  selectCustomerVolumeDataStatus,
  fetchVolumeData,
} from "../../redux/slices/depletionSlice";
// ---------------------

import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import { useUser } from "../../userContext";
import {
  FORECAST_OPTIONS,
  MONTH_NAMES,
  MONTH_MAPPING,
  processMonthData,
  exportToCSV,
  hasNonZeroTotal,
  calculateTotal,
  ForecastLogic,
  SIDEBAR_GUIDANCE_OPTIONS,
} from "../util/volumeUtil";
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Comment as CommentIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  ViewHeadlineOutlined as ViewHeadlineOutlinedIcon,
} from "@mui/icons-material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// Import guidance calculations from the shared location
import {
  recalculateGuidance,
  getGuidanceDataForSidebar,
  calculateRowGuidanceMonthlyData,
  formatGuidanceValue,
} from "../calculations/guidanceCalculations";
// Import centralized guidance renderer
import { GuidanceRenderer } from "../guidance/guidanceRenderer";
// Import processRawData from calculations
import { processRawData } from "../calculations/depletionCalculations";

export interface ExtendedForecastData {
  id: string;
  market_id: string;
  market_name: string;
  customer_id?: string;
  customer_name?: string;
  market_area_name?: string; // Added new field
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
  cy_3m_case_equivalent_volume?: number;
  cy_6m_case_equivalent_volume?: number;
  cy_12m_case_equivalent_volume?: number;
  py_3m_case_equivalent_volume?: number;
  py_6m_case_equivalent_volume?: number;
  py_12m_case_equivalent_volume?: number;
  prev_published_case_equivalent_volume?: number; // LC Volume Total
  lc_gross_sales_value?: number; // LC GSV Total
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  // Optional: Add monthly breakdown for LC if available and needed for row guidance
  prev_published_case_equivalent_volume_months: {
    // Made non-optional
    [key: string]: { value: number; isActual?: boolean };
  };
  lc_gross_sales_value_months?: {
    // Monthly LC GSV for row guidance
    [key: string]: { value: number };
  };
  commentary?: string;
  isLoading?: boolean;
  forecast_status?: string;
  tags?: { tag_id: number; tag_name: string }[];
  [key: string]: any; // Allow dynamic guidance values
  historical_gsv_rate?: number; // Added for LC GSV calculation
  forecast_generation_month_date?: string; // Added for forecast generation date
}

export type FilterSelectionProps = {
  selectedMarkets: string[];
  selectedBrands: string[];
  selectedTags: number[];
  marketMetadata: MarketData[];
  isCustomerView?: boolean;
  onUndo?: (handler: () => Promise<void>) => void;
  onExport?: (handler: () => void) => void;
  onAvailableBrandsChange?: (brands: string[]) => void;
  onAvailableMarketsChange?: (markets: string[]) => void;
  selectedGuidance?: Guidance[];
  rowGuidanceSelections?: Guidance[];
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
  selectedTags,
  marketMetadata,
  isCustomerView,
  onUndo,
  onExport,
  onAvailableBrandsChange,
  onAvailableMarketsChange,
  selectedGuidance,
  rowGuidanceSelections,
}) => {
  const { user } = useUser();
  const theme = useTheme();
  const dispatch: AppDispatch = useDispatch(); // <-- Get the dispatch function

  // --- Redux State for Volume Data --- START
  const rawVolumeData = useSelector(selectRawVolumeData);
  const depletionsStatus = useSelector(selectVolumeDataStatus);
  // Select customer data
  const customerRawVolumeData = useSelector(selectCustomerRawVolumeData);
  const customerDepletionsStatus = useSelector(selectCustomerVolumeDataStatus);
  // --- Redux State for Volume Data --- END

  // Determine the relevant data and status based on the view
  const relevantRawData = isCustomerView
    ? customerRawVolumeData
    : rawVolumeData;
  const relevantDepletionsStatus = isCustomerView
    ? customerDepletionsStatus
    : depletionsStatus;

  // --- Log the received data --- START
  useEffect(() => {}, [
    rawVolumeData,
    depletionsStatus,
    customerRawVolumeData,
    customerDepletionsStatus,
  ]);
  // --- Log the received data --- END

  const [forecastData, setForecastData] = useState<ExtendedForecastData[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [selectedRowForSidebar, setSelectedRowForSidebar] = useState<
    string | null
  >(null);
  const [selectedDataState, setSelectedDataState] =
    useState<ExtendedForecastData | null>(null);
  const [initialSidebarState, setInitialSidebarState] =
    useState<ExtendedForecastData | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
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
  const [selectedDetails, setSelectedDetails] = useState<{
    market_id: string;
    product: string;
    value: number;
    month: number;
    year: number;
    variant_size_pack_id: string;
    variant_size_pack_desc: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishComment, setPublishComment] = useState("");
  const [publishCommentError, setPublishCommentError] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishConfirmationText, setPublishConfirmationText] = useState("");
  const [publishConfirmationError, setPublishConfirmationError] =
    useState(false);
  const [filterChangeCount, setFilterChangeCount] = useState(0);
  const [prevFilters, setPrevFilters] = useState({
    markets: selectedMarkets,
    brands: selectedBrands,
    tags: selectedTags,
  });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Check if the current user can edit data
  const canEdit = useMemo(() => {
    return (
      user?.role === "Market Manager" ||
      user?.role === "Finance" ||
      user?.role === "Executive"
    );
  }, [user?.role]);

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
          ? selectedMarkets.includes(row.customer_id || "")
          : selectedMarkets.includes(row.market_id));
      const brandMatch =
        selectedBrands.length === 0 || selectedBrands.includes(row.brand);

      // Add tag filtering
      const tagMatch =
        selectedTags.length === 0 ||
        (row.tags && row.tags.some((tag) => selectedTags.includes(tag.tag_id)));

      return marketMatch && brandMatch && tagMatch;
    });
  }, [
    forecastData,
    selectedMarkets,
    selectedBrands,
    selectedTags,
    isCustomerView,
  ]);

  // Update useEffect to set available markets based on view type
  useEffect(() => {
    if (isCustomerView) {
      const customerIds = marketMetadata
        .filter((market) => market.settings?.managed_by === "Customer")
        .flatMap((market) => market.customers || [])
        .map((customer) => customer.customer_id);
      setAvailableMarkets(customerIds);
    } else {
      const marketIds = marketMetadata
        .filter((market) => market.settings?.managed_by === "Market")
        .map((market) => market.market_id);
      setAvailableMarkets(marketIds);
    }
  }, [isCustomerView, marketMetadata]);

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
                commentary: restored.comment, // Restore the comment from the previous state
              };

              // Recalculate total volume
              const totalVolume = calculateTotal(restored.months);
              updatedItem.case_equivalent_volume = totalVolume;

              // Recalculate guidance if they exist
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
        dispatch(triggerSync()); // Dispatch sync after successful undo
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
    dispatch,
  ]);

  // Now the effect can safely include handleUndo in deps
  useEffect(() => {
    if (onUndo) {
      onUndo(handleUndo);
    }
  }, [onUndo, handleUndo]);

  // Handler for icon click (expansion only)
  const handleExpandClick = (rowId: string) => {
    setExpandedRowIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(rowId)) {
        newIds.delete(rowId);
      } else {
        newIds.add(rowId);
      }
      return newIds;
    });
  };

  // Handler for clicking the row itself (Sidebar selection)
  const handleSidebarSelect = (row: ExtendedForecastData) => {
    if (row.forecast_status === "review" || row.forecast_status === "consensus")
      return;

    // Check if user has permission to edit data
    if (!canEdit) {
      return; // Don't open sidebar for users without edit permissions
    }

    setSelectedRowForSidebar(row.id);
    const selectedData = filteredData.find((r) => r.id === row.id);
    if (selectedData) {
      // Deep clone to prevent mutation issues
      const clonedData = JSON.parse(JSON.stringify(selectedData));
      setSelectedDataState(clonedData); // Set the editable state
      setInitialSidebarState(clonedData); // Set the initial state for comparison/undo logging
    } else {
      setSelectedDataState(null);
      setInitialSidebarState(null);
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
        forecast_generation_month_date: rowData.forecast_generation_month_date, // Add forecast_generation_month_date
        months: JSON.parse(JSON.stringify(rowData.months)),
        comment: rowData.commentary || null, // Add initial comment for undo
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

      // Find the last actual month index
      let lastActualMonthIndex = -1;
      MONTH_NAMES.forEach((m, index) => {
        if (updatedMonths[m]?.isActual) {
          lastActualMonthIndex = Math.max(lastActualMonthIndex, index);
        }
      });

      // Use projected volume for the current month if available (except Control states)
      const currentMonthIndex = lastActualMonthIndex + 1;
      if (currentMonthIndex < MONTH_NAMES.length) {
        const currentMonth = MONTH_NAMES[currentMonthIndex];
        const currentMonthData = forecastResponseData.find(
          (item: any) => item.month === currentMonthIndex + 1
        );

        if (currentMonthData) {
          // For Control states we purposely bypass projected volumes because of data-lag
          const shouldUseProjected =
            rowData.market_area_name !== "Control" &&
            currentMonthData.projected_case_equivalent_volume !== undefined;

          const newValue = shouldUseProjected
            ? currentMonthData.projected_case_equivalent_volume
            : currentMonthData.case_equivalent_volume;

          if (newValue !== undefined) {
            updatedMonths[currentMonth] = {
              ...updatedMonths[currentMonth],
              value: Math.round(newValue * 100) / 100,
            };
          }
        }
      }

      // Create base updated row with new forecast logic and months
      let updatedRow = {
        ...rowData,
        forecastLogic: newLogic,
        months: updatedMonths,
      };

      // Use the centralized function to recalculate all guidance
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
            forecast_generation_month_date:
              rowData.forecast_generation_month_date, // Add forecast_generation_month_date
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        dispatch(triggerSync()); // <-- Dispatch the Redux action
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
    if (!user || !initialSidebarState) return; // Add check for initialSidebarState

    try {
      // Use the initial state we captured when the sidebar was opened
      const stateToLogForUndo = {
        userId: user.id,
        market_id: isCustomerView
          ? initialSidebarState.customer_id // Use initial state here
          : initialSidebarState.market_id, // Use initial state here
        market_name: isCustomerView
          ? initialSidebarState.customer_name // Use initial state here
          : initialSidebarState.market_name, // Use initial state here
        variant_size_pack_desc: initialSidebarState.variant_size_pack_desc, // Use initial state here
        variant_size_pack_id: initialSidebarState.variant_size_pack_id, // Use initial state here
        brand: initialSidebarState.brand, // Use initial state here
        variant: initialSidebarState.variant, // Use initial state here
        variant_id: initialSidebarState.variant_id, // Use initial state here
        customer_id: isCustomerView ? initialSidebarState.customer_id : null, // Use initial state here
        customer_name: isCustomerView
          ? initialSidebarState.customer_name
          : null, // Use initial state here
        forecastType: initialSidebarState.forecastLogic, // Use initial forecast logic
        forecast_generation_month_date:
          initialSidebarState.forecast_generation_month_date, // Add forecast_generation_month_date
        months: JSON.parse(JSON.stringify(initialSidebarState.months)), // Use initial months data
        comment: initialSidebarState.commentary || null, // Add initial comment for undo
      };

      // First update the forecast (still uses editedData for the actual change)
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

      // Then log to Redis with the correct initial state for undo
      // and the current edited state for the actual log entry
      await axios.post(
        `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
        {
          userId: user.id,
          market_id: isCustomerView // Log current market/customer
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
          forecastType: editedData.forecastLogic, // Log current forecast logic
          months: JSON.parse(JSON.stringify(editedData.months)), // Log current months
          initialState: stateToLogForUndo, // <<< Pass the correctly captured initial state
          isManualEdit: true, // <<< Flag this as a manual edit
          comment: editedData.commentary || null, // Log current comment
          forecast_generation_month_date:
            editedData.forecast_generation_month_date, // Add forecast_generation_month_date
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Recalculate guidance if they exist
      let finalEditedData = editedData;
      if (selectedGuidance && selectedGuidance.length > 0) {
        finalEditedData = recalculateGuidance(editedData, selectedGuidance);
      }

      // Update local state
      setForecastData((prevData) =>
        prevData.map((item) =>
          item.id === finalEditedData.id ? finalEditedData : item
        )
      );

      // Clear the initial state reference after successful save
      setInitialSidebarState(null);
      dispatch(triggerSync()); // <-- Dispatch the Redux action
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

  const handleCommentaryChange = (value: string) => {
    if (!selectedDataState || !canEdit) return;

    setSelectedDataState((prev) =>
      prev ? { ...prev, commentary: value } : prev
    );
    setHasChanges(true);
  };

  const handleSidebarSaveChanges = async () => {
    if (!selectedDataState) return;

    try {
      await handleSidebarSave(selectedDataState);
      setHasChanges(false);
      // setCommentDialogOpen(false); // Likely not needed if sidebar closes
      showSnackbar("Changes saved successfully", "success");

      // *** Close sidebar after successful save ***
      setSelectedRowForSidebar(null);
      setSelectedDataState(null);
      setInitialSidebarState(null); // Clear initial state on close as well
    } catch (error) {
      console.error("Error saving changes:", error);
      showSnackbar("Failed to save changes", "error");
      // Keep sidebar open on error
    }
  };

  const columns: Column[] = useMemo(() => {
    const hasRowGuidance =
      rowGuidanceSelections && rowGuidanceSelections.length > 0;

    // Consistent vertical padding for table cells
    const cellPaddingSx = { py: "6px", px: "16px" }; // Explicitly set horizontal padding

    // Define the VOL 9L TY column configuration
    const volTyColumn: Column = {
      key: "total",
      header: "VOL TY",
      subHeader: "FY (9L)",
      align: "right" as const,
      sortable: true,
      sortAccessor: (row: ExtendedForecastData) => calculateTotal(row.months),
      sx: cellPaddingSx, // Apply consistent padding
      render: (_: any, row: ExtendedForecastData) => {
        if (row.isLoading) {
          return (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size={16} thickness={4} />
            </Box>
          );
        }
        const total = calculateTotal(row.months);
        return isNaN(total)
          ? "-"
          : total.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
      },
    };

    // Define guidance columns (mapping over selectedGuidance)
    const derivedGuidanceColumns: Column[] =
      selectedGuidance?.map((guidance) => ({
        key: `guidance_${guidance.id}`,
        header: guidance.label,
        subHeader: guidance.sublabel,
        align: "right" as const,
        width: 50,
        sortable: true,
        sortAccessor: (row: ExtendedForecastData) => {
          // For multi_calc, sorting might be complex. Sort by the first sub-calc value for now?
          if (guidance.calculation.type === "multi_calc") {
            const valueKey = `guidance_${guidance.id}`;
            const value = row[valueKey];
            if (typeof value === "object" && value !== null) {
              const firstSubCalcId =
                guidance.calculation.subCalculations?.[0]?.id;
              return firstSubCalcId ? value[firstSubCalcId] : undefined;
            }
            return undefined;
          }
          // Original sort accessor for single values
          const valueKey =
            typeof guidance.value === "string"
              ? guidance.value
              : `guidance_${guidance.id}`;
          return row[valueKey as keyof ExtendedForecastData] as
            | number
            | undefined;
        },
        sx: {
          ...cellPaddingSx,
          minWidth: guidance.id === 1 ? 150 : 80, // wider guidance columns (updated from 14 to 1 for Trends)
        }, // Apply consistent padding
        render: (_: any, row: ExtendedForecastData) => {
          // Create calculation result from row data
          const valueKey = `guidance_${guidance.id}`;
          const value = row[valueKey];

          let calculationResult;
          if (
            guidance.calculation.type === "multi_calc" &&
            typeof value === "object" &&
            value !== null
          ) {
            calculationResult = { multiCalc: value };
          } else if (typeof value === "number") {
            calculationResult = { total: value };
          } else {
            calculationResult = undefined;
          }

          return (
            <GuidanceRenderer
              guidance={guidance}
              calculationResult={calculationResult}
              calcStatus={row.isLoading ? "calculating" : "succeeded"}
            />
          );
        },
      })) || [];

    // Define Control Section
    const controlSection: Column = {
      key: "control_section",
      header: "CONTROL",
      columnGroup: true,
      columns: [
        {
          key: "market",
          header: "MARKET",
          align: "center" as const,
          sortable: true,
          sortAccessor: "market_name",
          sx: { ...cellPaddingSx, minWidth: 150 }, // Apply padding
          filterable: true, // <-- Enable filtering
          // Add getValue to extract the string for filtering
          getValue: (row: ExtendedForecastData) => row.market_name,
          render: (_: any, row: ExtendedForecastData) => {
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";
            const canClickRow = canEdit && !isLocked;
            const marketName = row.market_name;
            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canClickRow ? "pointer" : "default",
                  position: "relative",
                  pl: isLocked ? "24px" : "0px",
                }}
              >
                {isLocked && (
                  <LockIcon
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "1rem",
                      color: "action.disabled",
                    }}
                  />
                )}
                {isCustomerView ? row.market_name : marketName}
              </Box>
            );
          },
        },
        ...(isCustomerView
          ? [
              {
                key: "customer",
                header: "CUSTOMER",
                align: "left" as const,
                extraWide: true,
                sx: cellPaddingSx,
                // Potentially make filterable too if needed
                render: (_: any, row: ExtendedForecastData) =>
                  row.customer_name || "-",
              },
            ]
          : []),
        {
          key: "product",
          header: "PRODUCT",
          align: "center" as const,
          sortable: true,
          sortAccessor: (row: ExtendedForecastData) => {
            if (!row.product) return "";
            const parts = row.product.split(" - ");
            return parts.length > 1 ? parts[1] : row.product;
          },
          extraWide: true,
          sx: cellPaddingSx, // Apply padding
          filterable: true, // <-- Enable filtering
          // Add getValue to extract the string part for filtering
          getValue: (row: ExtendedForecastData) => {
            if (!row.product) return "";
            const parts = row.product.split(" - ");
            return parts.length > 1 ? parts[1] : row.product;
          },
          render: (_: any, row: ExtendedForecastData) => {
            if (!row.product) return "-";
            const parts = row.product.split(" - ");
            const productName = parts.length > 1 ? parts[1] : row.product;
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";
            const canClickRow = canEdit && !isLocked;
            return (
              <Box
                sx={{
                  cursor: canClickRow ? "pointer" : "default",
                }}
              >
                {productName}
              </Box>
            );
          },
        },
        {
          key: "forecastLogic",
          header: "LOGIC",
          align: "left" as const,
          sortable: false,
          sx: {
            ...cellPaddingSx,
            borderRight: "1px solid rgba(224, 224, 224, 1)",
            minWidth: 130,
          }, // Apply padding, increase minWidth
          render: (value: string, row: ExtendedForecastData) => {
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";
            return (
              <Select
                value={value}
                onChange={(e) => handleLogicChange(e, row.id)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{ fontSize: "inherit", minWidth: 130 }}
                disabled={isLocked || row.isLoading || !canEdit}
              >
                {FORECAST_OPTIONS.map((option) => (
                  <MenuItem key={option.id} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            );
          },
        },
      ],
    };

    // Find the index of the last actual month globally
    let lastActualMonthIndex = -1;
    forecastData.forEach((row) => {
      MONTH_NAMES.forEach((m, index) => {
        if (row.months[m]?.isActual) {
          lastActualMonthIndex = Math.max(lastActualMonthIndex, index);
        }
      });
    });

    // Define Phasing Columns (Months + Commentary)
    const monthAndCommentaryColumns: Column[] = [
      ...MONTH_NAMES.map((month, monthIndex) => {
        // Determine if this is the current month (first forecast month)
        const isCurrentMonth = monthIndex === lastActualMonthIndex + 1;

        return {
          key: `months.${month}`,
          header: month,
          subHeader:
            monthIndex <= lastActualMonthIndex ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: "100%",
                }}
              >
                <Box component="span" sx={{ flexGrow: 1, textAlign: "center" }}>
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
            ) : isCurrentMonth ? (
              "PROJ"
            ) : (
              "FCST"
            ),
          align: "right" as const,
          sortable: true,
          sortAccessor: (row: ExtendedForecastData) => row.months[month]?.value,
          sx: { ...cellPaddingSx, minWidth: 65 },
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
            const value = data.value ?? 0;
            const isRowActual = data.isActual;
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";

            // Determine if this specific cell should be treated as preview
            let isCellPreview = false;
            if (!isRowActual) {
              let rowLastActualIndex = -1;
              MONTH_NAMES.forEach((m, idx) => {
                if (row.months[m]?.isActual) {
                  rowLastActualIndex = Math.max(rowLastActualIndex, idx);
                }
              });
              isCellPreview = monthIndex === rowLastActualIndex + 1;
            }

            // Click handler remains, but internal lock check is removed
            const handleClick = (event: React.MouseEvent) => {
              event.stopPropagation();

              const currentYear = new Date().getFullYear();
              setSelectedDetails({
                market_id: row.market_id,
                product: row.product,
                value:
                  value === 0 && (isRowActual || isCellPreview)
                    ? -1
                    : Math.round(value),
                month: MONTH_MAPPING[month],
                year: currentYear,
                variant_size_pack_id: row.variant_size_pack_id,
                variant_size_pack_desc: row.variant_size_pack_desc,
              });
              setDetailsOpen(true);
            };

            const isClickable = isRowActual || isCellPreview;

            return (
              <div style={{ position: "relative" }}>
                <Box
                  component="span"
                  sx={(theme) => ({
                    color:
                      isRowActual || isCellPreview
                        ? theme.palette.primary.main // Always primary color if actual/preview
                        : isLocked // Mute color if locked AND forecast
                        ? theme.palette.text.disabled
                        : theme.palette.text.primary,
                    // Cursor is pointer ONLY if it's an actual/preview month
                    cursor: isClickable ? "pointer" : "default",
                    textDecoration: "none",
                  })}
                  // Assign onClick ONLY if it's an actual/preview month
                  onClick={isClickable ? handleClick : undefined}
                >
                  {value.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </Box>
                {data.isManuallyModified && !data.isActual && (
                  <Tooltip title="Manually Edited">
                    <EditIcon
                      sx={{
                        fontSize: "0.875rem",
                        position: "absolute",
                        right: "-16px", // Position relative to number
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "secondary.main",
                        opacity: 0.7,
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            );
          },
        };
      }),
      // Commentary Column
      {
        key: "commentary",
        header: <DescriptionOutlinedIcon fontSize="small" />,
        align: "center" as const,
        sx: cellPaddingSx, // Apply padding
        render: (commentary: string | undefined) => {
          return (
            <Box
              onClick={(e) => {
                if (commentary) {
                  handleCommentClick(e, commentary);
                } else {
                  e.stopPropagation();
                }
              }}
              sx={{
                cursor: commentary ? "pointer" : "default",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "24px", // Keep min-height for consistency when empty
              }}
            >
              {commentary ? (
                <Tooltip title="View Comment">
                  <CommentIcon fontSize="small" color="primary" />
                </Tooltip>
              ) : (
                <Box sx={{ width: "16px" }} />
              )}
            </Box>
          );
        },
      },
    ];

    // Create the base guidance columns using the renamed variable
    let guidanceColumns = [volTyColumn, ...derivedGuidanceColumns];

    // Define the row guidance label column if needed, making it non-sticky and compact
    if (hasRowGuidance) {
      const rowGuidanceLabelColumn: Column = {
        key: "row_guidance_label",
        header: <ViewHeadlineOutlinedIcon fontSize="small" />,
        align: "center" as const,
        sx: {
          ...cellPaddingSx, // Apply consistent padding
          minWidth: 120, // Ensure minimum width to prevent text wrapping
        },
        render: (_: any, row: ExtendedForecastData) => {
          const isExpanded = expandedRowIds.has(row.id);
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
                  VOL TY
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ fontStyle: "italic", lineHeight: 1.1 }}
                >
                  FY (9L)
                </Typography>
              </Box>
              <IconButton
                aria-label="expand row"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandClick(row.id);
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
                {isExpanded ? (
                  <KeyboardArrowDownIcon fontSize="inherit" />
                ) : (
                  <ChevronRightIcon fontSize="inherit" />
                )}
              </IconButton>
            </Box>
          );
        },
      };
      guidanceColumns.push(rowGuidanceLabelColumn);
    }

    // Apply the main right border to the actual last column of the guidance section
    if (guidanceColumns.length > 0) {
      const lastGuidanceIndex = guidanceColumns.length - 1;
      const lastColumn = guidanceColumns[lastGuidanceIndex];
      // Ensure sx exists before spreading, and apply border
      guidanceColumns[lastGuidanceIndex] = {
        ...lastColumn,
        sx: {
          ...(lastColumn.sx || {}), // Safely spread existing sx (which includes cellPaddingSx)
          borderRight: "1px solid rgba(224, 224, 224, 1)",
        },
      };
    }

    // Define the final base structure
    let baseColumns: Column[] = [
      controlSection,
      {
        key: "guidance_section",
        header: "GUIDANCE",
        columnGroup: true,
        columns: guidanceColumns,
      },
      {
        key: "months_section",
        header: "PHASING",
        columnGroup: true,
        columns: monthAndCommentaryColumns,
      },
    ];

    return baseColumns;
  }, [
    selectedGuidance,
    rowGuidanceSelections,
    expandedRowIds,
    isCustomerView,
    forecastData,
    marketMetadata,
    handleLogicChange,
    handleCommentClick,
    handleExpandClick,
  ]);

  // --- Function to render the expanded content ---
  // Returns one or more TableRow components
  const renderExpandedRowContent = (
    row: ExtendedForecastData,
    flatColumns: Column[]
  ) => {
    if (!rowGuidanceSelections || rowGuidanceSelections.length === 0) {
      return null;
    }
    const guidanceData = rowGuidanceSelections
      .map((guidance) => ({
        guidance,
        monthlyData: calculateRowGuidanceMonthlyData(row, guidance),
      }))
      .filter((item) => item.monthlyData);

    if (guidanceData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={flatColumns.length} align="center">
            <Typography variant="caption">
              Could not calculate row guidance data.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const cellPaddingSx = { py: "6px", px: "16px" };

    return guidanceData.map(({ guidance, monthlyData }) => {
      const isLYGuidance = guidance.value === "py_case_equivalent_volume";

      return (
        <TableRow
          key={`${row.id}-${guidance.id}`}
          sx={{ backgroundColor: "action.hover" }}
        >
          {flatColumns.map((col) => {
            let cellContent: React.ReactNode = null;

            // Only render content for specific columns we care about
            if (col.key === "row_guidance_label") {
              // Row guidance label column
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
                      sx={{
                        fontStyle: "italic",
                        lineHeight: 1.1,
                      }}
                    >
                      {guidance.sublabel}
                    </Typography>
                  )}
                </Box>
              );
            } else if (col.key.startsWith("months.")) {
              // Month columns
              const month = col.key.split(".")[1];
              const value = monthlyData ? monthlyData[month] : undefined;
              const formattedValue = formatGuidanceValue(
                value,
                guidance.calculation.format,
                guidance.label
              );

              if (isLYGuidance) {
                cellContent = (
                  <Box
                    component="span"
                    sx={{
                      color: "primary.main",
                      cursor: "pointer",
                      display: "inline-block",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedDetails({
                        market_id: row.market_id,
                        product: row.product,
                        value: value === 0 ? -1 : Math.round(value || 0),
                        month: MONTH_MAPPING[month],
                        year: previousYear,
                        variant_size_pack_id: row.variant_size_pack_id,
                        variant_size_pack_desc: row.variant_size_pack_desc,
                      });
                      setDetailsOpen(true);
                    }}
                  >
                    {formattedValue}
                  </Box>
                );
              } else {
                cellContent = formattedValue;
              }
            }
            // All other columns (control, guidance, commentary) get empty cells
            // This automatically maintains alignment without needing to handle each type

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
      );
    });
  };

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

      // After successful save, fetch fresh data
      dispatch(
        fetchVolumeData({
          markets: selectedMarkets,
          brands: selectedBrands,
          isCustomerView: isCustomerView ?? false,
        })
      );

      showSnackbar("Changes saved successfully", "success");
    } catch (error) {
      console.error("Error saving changes:", error);
      showSnackbar("Failed to save changes", "error");
    }
  };

  const handlePublish = () => {
    setPublishComment(""); // Reset comment
    setPublishCommentError(false); // Reset error
    setPublishConfirmationText(""); // Reset confirmation text
    setPublishConfirmationError(false); // Reset confirmation error
    setIsPublishing(false); // Reset loading state
    setPublishDialogOpen(true); // Open dialog
  };

  const handleClosePublishDialog = () => {
    if (isPublishing) return; // Don't close while publishing
    setPublishDialogOpen(false);
  };

  const handleConfirmPublish = async () => {
    let hasError = false;
    if (!publishComment.trim()) {
      setPublishCommentError(true);
      hasError = true;
    }
    if (publishConfirmationText !== "PUBLISH") {
      setPublishConfirmationError(true);
      hasError = true;
    }

    if (hasError) return;

    setPublishCommentError(false);
    setPublishConfirmationError(false);
    setIsPublishing(true);

    if (!user || !userAccess || !userAccess.Division) {
      // Added check for Division
      showSnackbar("User information or Division not available.", "error");
      setIsPublishing(false);
      return;
    }

    const isCorporate = userAccess.Division === "Corporate";
    // Use 'corporate' specifically if division is 'Corporate', otherwise use the division name
    const divisionParam = isCorporate ? "corporate" : userAccess.Division;
    const publicationStatus = isCorporate ? "consensus" : "review";
    const userId = user.id;

    // Find the first available forecast_generation_month_date from forecastData
    const forecastGenerationMonth = forecastData.find(
      (row) => row.forecast_generation_month_date
    )?.forecast_generation_month_date;

    // Convert the datetime to YYYY-MM-DD format if it exists
    const formattedForecastMonth = forecastGenerationMonth
      ? new Date(forecastGenerationMonth).toISOString().split("T")[0]
      : undefined;

    if (!formattedForecastMonth) {
      showSnackbar(
        "Could not determine forecast generation month. Please try again.",
        "error"
      );
      setIsPublishing(false);
      return;
    }

    try {
      // Log the publish attempt
      console.log(
        `[PUBLISH] Attempting to publish forecast for ${divisionParam} to ${publicationStatus} status`
      );

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/publish-forecast`,
        {
          forecast_generation_month: formattedForecastMonth,
          division_name: divisionParam,
          user_id: userId,
          publication_status: publicationStatus,
          comment: publishComment.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        // After successful publish, fetch fresh data
        dispatch(
          fetchVolumeData({
            markets: selectedMarkets,
            brands: selectedBrands,
            isCustomerView: isCustomerView ?? false,
          })
        );

        // Show appropriate success message based on division and status
        const successMessage = isCorporate
          ? "Successfully promoted all divisions to consensus status"
          : `Successfully published ${userAccess.Division} forecast to "Review" status for review`;

        showSnackbar(successMessage, "success");
        setPublishDialogOpen(false);
      } else {
        throw new Error(response.data.message || "Publishing failed");
      }
    } catch (error) {
      // Log the error to audit system
      await axios.post(
        `${import.meta.env.VITE_API_URL}/audit/log`,
        {
          action_type: "PUBLISH_FORECAST",
          action: "Failed to publish forecast",
          details: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.message || error.message
              : error instanceof Error
              ? error.message
              : "Unknown error occurred",
            division: divisionParam,
            status: publicationStatus,
            userId,
            forecastMonth: formattedForecastMonth,
            userDivision: userAccess.Division,
          },
          status: "FAILURE",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : "An unexpected error occurred during publishing.";

      showSnackbar(
        `Publish failed: ${errorMessage}. Please check audit logs for details.`,
        "error"
      );
    } finally {
      setIsPublishing(false);
    }
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
    if (!selectedDataState || !canEdit) return;

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
    if (!selectedDataState || !canEdit) return;

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

      // Use the centralized function to recalculate all guidance
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

  // Replace the existing guidanceData useMemo with fixed types
  const sidebarGuidanceValues = useMemo(() => {
    if (!selectedDataState) return {};
    return getGuidanceDataForSidebar(
      selectedDataState,
      SIDEBAR_GUIDANCE_OPTIONS
    );
  }, [selectedDataState]);

  // Effect to process raw data from Redux when it changes
  useEffect(() => {
    if (relevantDepletionsStatus === "succeeded" && relevantRawData) {
      // Fetch logged changes (if necessary for applying Redis updates)
      fetchLoggedForecastChanges()
        .then((loggedChanges) => {
          const processed = processRawData(
            relevantRawData,
            loggedChanges, // Pass logged changes if needed
            isCustomerView ?? false,
            selectedGuidance
          );
          const nonZeroData = processed.filter(hasNonZeroTotal);
          setForecastData(nonZeroData);

          // Update available brands based on the processed data
          const brands = Array.from(
            new Set(nonZeroData.map((row) => row.brand))
          ).sort();
          setAvailableBrands(brands);
        })
        .catch((error) => {
          console.error("Error fetching logged changes:", error);
          // Optionally handle error, maybe process without logged changes
          const processed = processRawData(
            relevantRawData,
            [], // Process without logged changes on error
            isCustomerView ?? false,
            selectedGuidance
          );
          const nonZeroData = processed.filter(hasNonZeroTotal);
          setForecastData(nonZeroData);
          const brands = Array.from(
            new Set(nonZeroData.map((row) => row.brand))
          ).sort();
          setAvailableBrands(brands);
        });
    }
  }, [
    relevantRawData,
    relevantDepletionsStatus,
    isCustomerView,
    selectedGuidance,
  ]);

  // Parse user_access if it's a string
  const userAccess = useMemo(() => {
    if (!user?.user_access) return null;
    // Ensure user_access is an object, attempting to parse if it's a string
    if (typeof user.user_access === "string") {
      try {
        // Make sure to handle potential null/undefined after parsing
        const parsed = JSON.parse(user.user_access);
        return typeof parsed === "object" && parsed !== null ? parsed : null;
      } catch (error) {
        console.error("Failed to parse user_access:", error);
        return null;
      }
    }
    // Return as is if already an object (and not null)
    return typeof user.user_access === "object" && user.user_access !== null
      ? user.user_access
      : null;
  }, [user?.user_access]);

  // Check if the publish button should be visible
  const canPublish = user?.role === "Finance" && userAccess?.Admin === true;

  // New logic for Corporate user with draft forecasts
  const isCorporateUserWithDrafts =
    canPublish && // Only consider if user is eligible to publish at all
    userAccess?.Division === "Corporate" &&
    forecastData.some((item) => item.forecast_status === "draft");

  const publishButtonTooltipText = isCorporateUserWithDrafts
    ? "Forecast must be in 'Review' status to publish to consensus"
    : "";

  // Only increment filterChangeCount when filters actually change
  useEffect(() => {
    const hasFilterChanged =
      JSON.stringify(prevFilters.markets) !== JSON.stringify(selectedMarkets) ||
      JSON.stringify(prevFilters.brands) !== JSON.stringify(selectedBrands) ||
      JSON.stringify(prevFilters.tags) !== JSON.stringify(selectedTags);

    if (hasFilterChanged) {
      setFilterChangeCount((prev) => prev + 1);
      setPrevFilters({
        markets: selectedMarkets,
        brands: selectedBrands,
        tags: selectedTags,
      });
    }
  }, [selectedMarkets, selectedBrands, selectedTags]);

  return (
    <Box>
      <DynamicTable
        data={filteredData}
        columns={columns}
        onRowClick={handleSidebarSelect}
        expandedRowIds={expandedRowIds}
        renderExpandedRow={renderExpandedRowContent}
        getRowId={(row) => row.id}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 25, 50]}
        stickyHeader={true}
        maxHeight="calc(100vh)"
        enableColumnFiltering={true}
        enableRowTooltip={true} // Enable the tooltip
        rowTooltipContent={(row: ExtendedForecastData) => {
          // Get the current column from the row's data
          const currentColumn = Object.keys(row).find(
            (key) => key.startsWith("guidance_") || key.startsWith("months.")
          );

          // Only show tooltip for guidance and phasing sections
          if (currentColumn) {
            // Define content
            const market = `Market: ${row.market_name || "N/A"}`;
            const product = `Product: ${row.variant_size_pack_desc || "N/A"}`;
            return (
              <>
                {market}
                <br />
                {product}
              </>
            );
          }
          return null; // No tooltip for control section
        }}
        filterChangeCount={filterChangeCount}
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
        {/* Conditionally render Publish button */}
        {canPublish &&
          (publishButtonTooltipText ? (
            <Tooltip title={publishButtonTooltipText}>
              <span>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handlePublish} // onClick is fine, button is disabled
                  disabled={true} // Disabled due to corporate/draft condition
                >
                  <PublishIcon sx={{ mr: 1 }} />
                  Publish
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={handlePublish}
              disabled={isPublishing} // Default disable condition
            >
              <PublishIcon sx={{ mr: 1 }} />
              Publish
            </Button>
          ))}
      </Box>

      <QuantSidebar
        open={!!selectedRowForSidebar}
        onClose={() => {
          setSelectedRowForSidebar(null);
          setSelectedDataState(null);
          setInitialSidebarState(null); // Clear initial state on close
        }}
        title={
          isCustomerView
            ? "Customer Forecast Details"
            : "Market Forecast Details"
        }
        marketName={selectedDataState?.market_name}
        customerName={
          isCustomerView ? selectedDataState?.customer_name : undefined
        }
        productName={selectedDataState?.product}
        forecastLogic={selectedDataState?.forecastLogic}
        forecastOptions={FORECAST_OPTIONS}
        onForecastLogicChange={
          canEdit ? handleSidebarForecastChange : undefined
        }
        pyTotalVolume={selectedDataState?.py_case_equivalent_volume}
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
        guidanceForecasts={SIDEBAR_GUIDANCE_OPTIONS}
        availableGuidanceData={sidebarGuidanceValues}
        months={selectedDataState?.months || {}}
        onMonthValueChange={canEdit ? handleMonthValueChange : () => {}}
        gsvRate={
          selectedDataState?.gross_sales_value
            ? selectedDataState.gross_sales_value /
              calculateTotal(selectedDataState.months)
            : undefined
        }
        commentary={selectedDataState?.commentary}
        onCommentaryChange={canEdit ? handleCommentaryChange : undefined}
        footerButtons={[
          {
            label: "Close",
            onClick: () => {
              setSelectedRowForSidebar(null);
              setSelectedDataState(null);
            },
            variant: "outlined",
          },
          ...(canEdit
            ? [
                {
                  label: "Apply Changes",
                  onClick: handleSidebarSaveChanges,
                  variant: "contained" as const,
                  disabled: !hasChanges,
                },
              ]
            : []),
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
          market_id={selectedDetails.market_id}
          product={selectedDetails.product}
          value={selectedDetails.value}
          month={selectedDetails.month}
          year={selectedDetails.year}
          variant_size_pack_id={selectedDetails.variant_size_pack_id}
          variant_size_pack_desc={selectedDetails.variant_size_pack_desc}
        />
      )}

      {/* --- Publish Confirmation Dialog --- */}
      <Dialog
        open={publishDialogOpen}
        onClose={handleClosePublishDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isPublishing} // Prevent closing while loading
      >
        <DialogTitle color="primary">Publish Forecast</DialogTitle>
        <DialogContent>
          {userAccess?.Division === "Corporate" ? (
            <Typography variant="body1" gutterBottom>
              By selecting "Publish", you will finalize this period's forecast
              for the company. Please provide a comment and provide confirmation
              below before selecting 'Publish'.
            </Typography>
          ) : (
            <Typography variant="body1" gutterBottom>
              By selecting "Publish", you will finalize the forecast for the{" "}
              <strong>{userAccess?.Division ?? "selected"}</strong> division.
              Please provide a comment and provide confirmation below before
              selecting 'Publish'.
            </Typography>
          )}

          <TextField
            autoFocus
            required
            margin="dense"
            id="publishComment"
            label="Comment (Required)"
            type="text"
            fullWidth
            variant="outlined"
            value={publishComment}
            onChange={(e) => {
              setPublishComment(e.target.value);
              if (e.target.value.trim()) {
                setPublishCommentError(false);
              }
            }}
            error={publishCommentError}
            helperText={publishCommentError ? "Comment is required." : ""}
            disabled={isPublishing}
            multiline
            rows={3}
          />

          <TextField
            required
            margin="dense"
            id="publishConfirmation"
            label="To publish, please type 'PUBLISH' and then select 'Publish'"
            type="text"
            fullWidth
            variant="outlined"
            value={publishConfirmationText}
            onChange={(e) => {
              setPublishConfirmationText(e.target.value);
              if (e.target.value === "PUBLISH") {
                setPublishConfirmationError(false);
              } else if (e.target.value.trim() !== "") {
                // Show error only if they started typing and it's not correct
                setPublishConfirmationError(true);
              } else {
                // Clear error if field is empty
                setPublishConfirmationError(false);
              }
            }}
            onBlur={() => {
              // Validate on blur if text is present but not correct
              if (
                publishConfirmationText.trim() &&
                publishConfirmationText !== "PUBLISH"
              ) {
                setPublishConfirmationError(true);
              }
            }}
            error={publishConfirmationError}
            helperText={
              publishConfirmationError
                ? "Confirmation text does not match."
                : ""
            }
            disabled={isPublishing}
            sx={{ mt: 2 }} // Add some margin top for spacing
          />
        </DialogContent>
        <DialogActions sx={{ p: "16px 24px" }}>
          <Button onClick={handleClosePublishDialog} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            color="secondary"
            disabled={
              isPublishing ||
              publishCommentError ||
              !publishComment.trim() ||
              publishConfirmationText !== "PUBLISH" ||
              publishConfirmationError // Added check for confirmation error state
            }
            startIcon={
              isPublishing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PublishIcon />
              )
            }
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000} // Increased duration slightly
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }} // Center snackbar
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled" // Use filled variant for better visibility
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={undoSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setUndoSnackbarOpen(false)}
        message={undoMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};
