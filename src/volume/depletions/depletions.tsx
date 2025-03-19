import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Button,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import { useForecast } from "../../data/data";
import CommentIcon from "@mui/icons-material/Comment";
import { DetailsContainer } from "./details/detailsContainer";
import { CommentDialog } from "../components/commentDialog";
import type { MarketData } from "../volumeForecast";

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
} from "./util/depletionsUtil";

export interface ExtendedForecastData {
  id: string;
  market_id: string;
  market_name: string;
  product: string;
  brand: string;
  variant: string;
  variantSize: string;
  forecastLogic: string;
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
  commentary?: string;
}

export type ForecastLogic =
  | "two_month"
  | "three_month"
  | "six_month"
  | "nine_month"
  | "flat"
  | "run_rate";

export interface FilterSelectionProps {
  selectedMarkets: string[];
  selectedBrands: string[];
  marketMetadata: MarketData[];
  onUndo?: (handler: () => Promise<void>) => void;
  onExport?: (handler: () => void) => void;
}

// Add this helper function near the top with other utility functions
const fetchLoggedForecastChanges = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/redi/log-forecast-changes`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching logged forecast changes:", error);
    return [];
  }
};

// Update the processRawData function to better handle Redis data
const processRawData = (
  data: any[],
  loggedChanges: any[] = []
): ExtendedForecastData[] => {
  // Group by size_pack first to see what we're working with
  const groupedByProduct = data.reduce(
    (acc: { [key: string]: any[] }, item) => {
      const key = item.size_pack;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  console.log("Data grouped by product:", groupedByProduct);

  // Group data by market and size_pack combination
  const groupedData = data.reduce((acc: { [key: string]: any }, item: any) => {
    const key = `${item.market_id}-${item.size_pack}`;

    if (!acc[key]) {
      acc[key] = {
        id: key,
        market_id: item.market_id,
        market_name: item.market,
        product: item.size_pack,
        brand: item.brand,
        variant: item.variant,
        forecastLogic: item.forecast_method || "flat",
        months: {},
      };
    }

    // Process month data as it comes in
    const monthName = MONTH_NAMES[item.month - 1];
    acc[key].months[monthName] = {
      value: Math.round(item.case_equivalent_volume * 100) / 100,
      isActual: item.data_type?.includes("actual"),
      isManuallyModified: item.is_manual_input || false,
    };

    return acc;
  }, {});

  // Fill in any missing months with zeros
  Object.values(groupedData).forEach((item: any) => {
    MONTH_NAMES.forEach((month) => {
      if (!item.months[month]) {
        item.months[month] = {
          value: 0,
          isActual: false,
          isManuallyModified: false,
        };
      }
    });
  });

  // Apply any logged changes
  loggedChanges.forEach((change) => {
    const key = `${change.market}-${change.variantSize}`;
    if (groupedData[key]) {
      groupedData[key].forecastLogic = change.forecastType;
      groupedData[key].months = change.months;
    }
  });

  return Object.values(groupedData);
};

// Add this interface
interface UndoResponse {
  success: boolean;
  changedKey: string;
  restoredState: (ExtendedForecastData & { forecastType: string }) | null;
  hasMoreHistory: boolean;
}

// Add interface for restored state
interface RestoredState {
  market_id: string;
  market_name: string;
  variantSize: string;
  brand?: string;
  variant?: string;
  forecastType: string;
  months: any;
}

export const Depletions: React.FC<FilterSelectionProps> = ({
  selectedMarkets,
  selectedBrands,
  marketMetadata,
  onUndo,
  onExport,
}) => {
  const { user } = useUser();
  const { budgetData } = useForecast();
  const [forecastData, setForecastData] = useState<ExtendedForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    market: string;
    product: string;
    value: number;
    month: number;
    year: number;
  } | null>(null);
  const [undoSnackbarOpen, setUndoSnackbarOpen] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");

  // Add state for selectedData
  const [selectedDataState, setSelectedDataState] =
    useState<ExtendedForecastData | null>(null);

  // Add new state for the "no more actions" snackbar
  const [noMoreActionsSnackbarOpen, setNoMoreActionsSnackbarOpen] =
    useState(false);

  // Update the loadForecastData to include logging
  const loadForecastData = useMemo(
    () => async () => {
      if (selectedMarkets.length === 0 || selectedBrands.length === 0) {
        setForecastData([]);
        return;
      }

      try {
        setIsLoading(true);

        const [response, loggedChanges] = await Promise.all([
          fetch(
            `${import.meta.env.VITE_API_URL}/volume/depletions-forecast?` +
              `markets=${JSON.stringify(selectedMarkets)}` +
              `&brands=${JSON.stringify(selectedBrands)}` +
              `&method=flat`
          ),
          fetchLoggedForecastChanges(),
        ]);

        if (!response.ok) throw new Error("Failed to fetch forecast data");

        const rawData = await response.json();

        const processedData = processRawData(rawData, loggedChanges);

        const nonZeroData = processedData.filter(hasNonZeroTotal);

        setForecastData(nonZeroData);
      } catch (error) {
        console.error("Error loading forecast data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedMarkets, selectedBrands]
  );

  // Use loadForecastData in useEffect
  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  // Update handleUndo to handle the case when there's no more history
  const handleUndo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/redi/undo-last-change`,
        {
          method: "POST",
        }
      );

      if (response.status === 404) {
        // Show the "no more actions" snackbar
        setNoMoreActionsSnackbarOpen(true);
        return;
      }

      const data: UndoResponse = await response.json();

      if (data.success && data.restoredState) {
        const restored = data.restoredState as RestoredState;
        setForecastData((prevData) => {
          return prevData.map((item) => {
            if (item.id === `${restored.market_id}-${restored.variantSize}`) {
              return {
                id: item.id,
                market_id: restored.market_id,
                market_name: restored.market_name,
                product: restored.variantSize,
                brand: restored.brand || item.brand,
                variant: restored.variant || item.variant,
                variantSize: restored.variantSize,
                forecastLogic: restored.forecastType,
                months: restored.months,
              };
            }
            return item;
          });
        });

        setUndoMessage(`Undo successful`);
        setUndoSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error undoing change:", error);
    }
  };

  // Make sure handleUndo is registered with the parent component
  useEffect(() => {
    if (onUndo) {
      onUndo(handleUndo);
    }
  }, [onUndo]); // Remove handleUndo from dependencies to avoid recreation

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
  };

  // Update handleForecastChange to properly update selectedDataState
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
      // Store the initial state before making any changes
      const initialState = {
        userId,
        market_id: rowData.market_id,
        market_name: rowData.market_name,
        variantSize: rowData.product,
        forecastType: rowData.forecastLogic,
        months: rowData.months,
      };

      const requestBody = {
        forecastMethod: newLogic,
        market_id: rowData.market_id,
        variantSizePack: rowData.product,
      };

      const forecastResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/volume/change-forecast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!forecastResponse.ok) throw new Error("Failed to update forecast");
      const forecastResponseData = await forecastResponse.json();

      const updatedMonths = processMonthData(forecastResponseData);
      const updatedRow = {
        ...rowData,
        forecastLogic: newLogic,
        months: updatedMonths,
      };

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
        await fetch(
          `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              market_id: rowData.market_id,
              market_name: rowData.market_name,
              variantSize: rowData.product,
              forecastType: newLogic,
              months: updatedMonths,
              initialState, // Include the initial state
            }),
          }
        );
      }

      return updatedRow;
    } catch (error) {
      console.error("Error updating forecast:", error);
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

  // Update the filtered data logic
  const filteredData = forecastData.filter((row) => {
    const marketMatch =
      selectedMarkets.length === 0 || selectedMarkets.includes(row.market_id);
    const productMatch =
      selectedBrands.length === 0 || selectedBrands.includes(row.product);
    return marketMatch && productMatch;
  });

  const handleSidebarSave = async (editedData: ExtendedForecastData) => {
    if (!user) return;

    try {
      // Store the initial state before making changes
      const initialState = selectedDataState
        ? {
            userId: user.id,
            market_id: selectedDataState.market_id,
            market_name: selectedDataState.market_name,
            variantSize: selectedDataState.product,
            forecastType: selectedDataState.forecastLogic,
            months: selectedDataState.months,
          }
        : null;

      // First update the forecast
      const forecastResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/volume/change-forecast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forecastMethod: editedData.forecastLogic,
            market_id: editedData.market_id,
            variantSizePack: editedData.product,
          }),
        }
      );

      if (!forecastResponse.ok) {
        throw new Error("Failed to update forecast");
      }

      // Then log to Redis with the initial state
      await fetch(`${import.meta.env.VITE_API_URL}/redi/log-forecast-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          market_id: editedData.market_id,
          market_name: editedData.market_name,
          variantSize: editedData.product,
          forecastType: editedData.forecastLogic,
          months: editedData.months,
          initialState,
        }),
      });

      // Update local state
      setForecastData((prevData) =>
        prevData.map((item) => (item.id === editedData.id ? editedData : item))
      );

      setSelectedRow(null);
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  // Add function to calculate budget variance percentage
  const calculateBudgetVariance = (
    forecastTotal: number,
    budgetTotal: number
  ) => {
    if (budgetTotal === 0) return 0;
    return ((forecastTotal - budgetTotal) / budgetTotal) * 100;
  };

  // Add function to find matching budget row
  const findBudgetRow = (forecastRow: ExtendedForecastData) => {
    return budgetData.find(
      (budget) => budget.id === `budget-${forecastRow.id}`
    );
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
      {
        key: "market",
        header: "MARKET",
        align: "left",
        render: (_: any, row: ExtendedForecastData) => {
          const { user } = useUser();
          const marketInfo = user?.user_access?.Markets?.find(
            (m: MarketAccess) => m.market_code === row.market_name
          );
          return marketInfo?.market || row.market_name;
        },
      },
      {
        key: "product",
        header: "PRODUCT",
        align: "left",
      },
      {
        key: "forecastLogic",
        header: "LOGIC",
        align: "left",
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
      // Only generate month columns if we have data
      ...(forecastData.length > 0
        ? Object.keys(forecastData[0].months).map((month) => ({
            key: `months.${month}`,
            header: month,
            subHeader: forecastData[0].months[month].isActual ? "ACT" : "FCST",
            align: "right" as const,
            render: (_: any, row: ExtendedForecastData) => {
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

                      setSelectedDetails({
                        market: stateCode,
                        product: row.product,
                        value: Math.round(data.value),
                        month: MONTH_MAPPING[month],
                        year: 2025,
                      });
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
                    {Math.round(data.value).toLocaleString()}
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
          }))
        : []),
      {
        key: "total",
        header: "TOTAL",
        align: "right",
        render: (_: any, row: ExtendedForecastData) =>
          Math.round(calculateTotal(row.months)).toLocaleString(),
      },
      {
        key: "budget",
        header: "BUDGET",
        align: "right",
        render: (_: any, row: ExtendedForecastData) => {
          const budgetRow = findBudgetRow(row);
          return budgetRow
            ? calculateTotal(budgetRow.months).toLocaleString()
            : "0";
        },
      },
      {
        key: "variance",
        header: "% vs BUD",
        align: "right",
        render: (_: any, row: ExtendedForecastData) => {
          const budgetRow = findBudgetRow(row);
          const forecastTotal = calculateTotal(row.months);
          const budgetTotal = budgetRow ? calculateTotal(budgetRow.months) : 0;
          const variance = calculateBudgetVariance(forecastTotal, budgetTotal);
          return (
            <Box sx={{ color: variance < 0 ? "error.main" : "success.main" }}>
              {variance.toFixed(1)}%
            </Box>
          );
        },
      },
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
    [forecastData]
  );

  const handleSaveClick = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/redi/save-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      await response.json();
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  const handlePublish = () => {
    // Add publish logic here
    console.log("Publishing forecast...");
  };

  // Add handleExport function
  const handleExport = useCallback(() => {
    exportToCSV(forecastData);
  }, [forecastData]);

  // Register export handler
  useEffect(() => {
    if (onExport) {
      onExport(handleExport);
    }
  }, [onExport, handleExport]);

  // Add this log near where forecastData is initialized/loaded
  useEffect(() => {}, [forecastData]);

  // Update handleSidebarForecastChange to properly update both states
  const handleSidebarForecastChange = async (newLogic: string) => {
    if (!selectedDataState) return;

    try {
      const updatedRow = await handleForecastChange(
        newLogic,
        selectedDataState,
        {
          updateTable: true,
          userId: user?.id?.toString(),
        }
      );
      setSelectedDataState(updatedRow);
    } catch (error) {
      console.error("Error in handleSidebarForecastChange:", error);
    }
  };

  // Add this effect instead
  useEffect(() => {
    if (!selectedRow) {
      setSelectedDataState(null);
      return;
    }
    const rowData = forecastData.find((row) => row.id === selectedRow);
    setSelectedDataState(rowData || null);
  }, [selectedRow, forecastData]);

  return (
    <Box>
      <DynamicTable
        data={forecastData}
        columns={columns}
        onRowClick={(row) => handleRowClick(row.id)}
        selectedRow={selectedRow}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 25, 50, { value: -1, label: "All" }]}
        loading={isLoading}
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
        selectedData={selectedDataState || undefined}
        onSave={handleSidebarSave}
        onForecastLogicChange={handleSidebarForecastChange}
        forecastOptions={FORECAST_OPTIONS}
      />

      <CommentDialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        commentary={selectedComment}
      />

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
        message="Forecast Saved"
      />

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
