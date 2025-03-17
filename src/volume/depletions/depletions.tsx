import React, { useState, useMemo, useEffect } from "react";
import {
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import { useForecast } from "../../data/data";
import CommentIcon from "@mui/icons-material/Comment";
import { DetailsContainer } from "./details/detailsContainer";
import { CommentDialog } from "../components/CommentDialog";

import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import { useUser } from "../../userContext";

export interface ExtendedForecastData {
  id: string;
  market: string;
  product: string;
  item: string;
  brand: string;
  variant: string;
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
}

const FORECAST_OPTIONS = [
  {
    id: 1,
    label: "Two Month",
    value: "two_month",
  },
  {
    id: 2,
    label: "Three Month",
    value: "three_month",
  },
  {
    id: 3,
    label: "Six Month",
    value: "six_month",
  },
  {
    id: 4,
    label: "Nine Month",
    value: "nine_month",
  },
  {
    id: 5,
    label: "Flat",
    value: "flat",
  },
  {
    id: 6,
    label: "Run Rate",
    value: "run_rate",
  },
];

const monthMapping: { [key: string]: number } = {
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

// Add these helper functions at the top of the file, before the component
const processMonthData = (data: any[]) => {
  const months: { [key: string]: any } = {};
  const monthNames = [
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

  data.forEach((item: any) => {
    const monthName = monthNames[item.month - 1];
    months[monthName] = {
      value: Math.round(item.total_depletions),
      isActual: item.data_type.includes("actual"),
      isManuallyModified: false,
    };
  });

  return months;
};

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
  // Create a map of the stored changes
  const storedChanges = loggedChanges.reduce(
    (acc: { [key: string]: any }, change) => {
      // Use the same key format as in Redis
      const key = `${change.market}-${change.variantSize}`;
      // Store the entire change object
      acc[key] = {
        forecastType: change.forecastType,
        months: change.months, // This now contains the full months data from Redis
      };
      return acc;
    },
    {}
  );

  // Group data by market and variant_size_pack
  const groupedData = data.reduce((acc: { [key: string]: any }, item: any) => {
    const key = `${item.market}-${item.variant_size_pack}`;

    // Check if we have stored changes for this item
    const storedChange = storedChanges[key];

    if (!acc[key]) {
      acc[key] = {
        id: key,
        market: item.market,
        product: item.variant_size_pack,
        brand: item.brand,
        variant: item.variant,
        // Use stored forecast type if available
        forecastLogic: storedChange
          ? storedChange.forecastType
          : item.forecast_method || "flat",
        // Use stored months data if available, otherwise process the raw data
        months: storedChange ? storedChange.months : {},
      };
    }
    return acc;
  }, {});

  // Only process months for items without stored changes
  Object.keys(groupedData).forEach((key) => {
    if (!storedChanges[key]) {
      const rowData = data.filter(
        (item) => `${item.market}-${item.variant_size_pack}` === key
      );
      groupedData[key].months = processMonthData(rowData);
    }
  });

  return Object.values(groupedData);
};

// Add this helper function near your other utility functions
const hasNonZeroTotal = (row: ExtendedForecastData): boolean => {
  return (
    Object.values(row.months).reduce((sum, { value }) => sum + value, 0) > 0
  );
};

export const Depletions: React.FC<FilterSelectionProps> = ({
  selectedMarkets,
  selectedBrands,
}) => {
  const { user } = useUser();
  const { budgetData } = useForecast();
  const [forecastData, setForecastData] = useState<ExtendedForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [forecastName, setForecastName] = useState("");
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

  // Load forecast data when filters change
  useEffect(() => {
    const loadForecastData = async () => {
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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to fetch forecast data");
        }

        const rawData = await response.json();

        // Add debug logging
        console.log("Redis changes:", loggedChanges);

        const processedData = processRawData(rawData, loggedChanges);
        const nonZeroData = processedData.filter(hasNonZeroTotal);

        // Add debug logging
        console.log("Processed data with Redis changes:", processedData);

        setForecastData(nonZeroData);
      } catch (error) {
        console.error("Error loading forecast data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadForecastData();
  }, [selectedMarkets, selectedBrands]);

  const selectedData = forecastData.find((row) => row.id === selectedRow);

  const calculateTotal = (months: ExtendedForecastData["months"]) => {
    return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
  };

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
  };

  const handleLogicChange = async (
    event: SelectChangeEvent<string>,
    rowId: string
  ) => {
    event.stopPropagation();
    const newLogic = event.target.value as ForecastLogic;
    const rowData = forecastData.find((row) => row.id === rowId);

    if (!rowData) return;

    try {
      // First get the new forecast data
      const forecastResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/volume/change-forecast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forecastMethod: newLogic,
            market: rowData.market,
            variantSizePack: rowData.product,
          }),
        }
      );

      if (!forecastResponse.ok) throw new Error("Failed to update forecast");
      const forecastResponseData = await forecastResponse.json();

      // Add defensive check
      if (!forecastResponseData || !Array.isArray(forecastResponseData)) {
        throw new Error("Invalid forecast data received");
      }

      const processedMonths = processMonthData(forecastResponseData);

      // Then log to Redis with the new forecast data
      const redisResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            market: rowData.market,
            variantSize: rowData.product,
            forecastType: newLogic,
            months: processedMonths,
          }),
        }
      );

      if (!redisResponse.ok) throw new Error("Failed to log to Redis");

      // Update the UI with new data
      const updatedData = forecastData.map((row: ExtendedForecastData) => {
        if (row.id === rowId) {
          return { ...row, months: processedMonths, forecastLogic: newLogic };
        }
        return row;
      });

      setForecastData(updatedData);
    } catch (error) {
      console.error("Error updating forecast:", error);
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
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
      selectedMarkets.length === 0 || selectedMarkets.includes(row.market);
    const productMatch =
      selectedBrands.length === 0 || selectedBrands.includes(row.product);
    return marketMatch && productMatch;
  });

  const handleSidebarSave = async (editedData: ExtendedForecastData) => {
    if (!user) return;

    try {
      // Log the change to Redis
      const rediResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/redi/log-forecast-change`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: user.id,
            market: editedData.market,
            variantSize: editedData.product,
            forecastType: editedData.forecastLogic,
            months: editedData.months,
          }),
        }
      );

      if (!rediResponse.ok) {
        throw new Error("Failed to log forecast changes to REDI");
      }

      // Update local state
      setForecastData((prevData) =>
        prevData.map((item) => (item.id === editedData.id ? editedData : item))
      );

      // Close sidebar after successful save
      setSelectedRow(null);

      console.log("Changes saved successfully");
    } catch (error) {
      console.error("Error saving changes:", error);
      // Optionally handle error (show error message, etc.)
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
            (m: { state_code: string; state: string }) =>
              m.state_code === row.market
          );
          return marketInfo?.state || row.market;
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
                      setSelectedDetails({
                        market: row.market,
                        product: row.product,
                        value: data.value,
                        month: monthMapping[month],
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
                    {data.value.toLocaleString()}
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
          calculateTotal(row.months).toLocaleString(),
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

  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    setSaveDialogOpen(false);
    setSnackbarOpen(true);
    setForecastName(""); // Reset the forecast name
  };

  const handlePublish = () => {
    // Add publish logic here
    console.log("Publishing forecast...");
  };

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
        selectedData={selectedData}
        onSave={handleSidebarSave}
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

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Your Progress</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Forecast Name"
            type="text"
            fullWidth
            variant="outlined"
            value={forecastName}
            onChange={(e) => setForecastName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfirm} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message="Forecast Saved"
      />
    </Box>
  );
};
