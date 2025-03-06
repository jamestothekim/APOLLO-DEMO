import React, { useState, useMemo } from "react";
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
import { ForecastSidebar } from "./depletionSidebar";
import EditIcon from "@mui/icons-material/Edit";
import {
  FORECAST_LOGIC_OPTIONS,
  type ForecastData,
  type ForecastLogic,
  useForecast,
} from "../../data/data";
import CommentIcon from "@mui/icons-material/Comment";
import { DetailsContainer } from "./details/detailsContainer";
import { CommentDialog } from "../components/CommentDialog";
import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";

interface ModelProps {
  selectedMarkets: string[];
  selectedItems: string[];
}

export const Model: React.FC<ModelProps> = ({
  selectedMarkets,
  selectedItems,
}) => {
  const {
    forecastData,
    budgetData,
    updateForecastData,
    updateSingleForecast,
    getGrowthRate,
  } = useForecast();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [forecastName, setForecastName] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<{
    market: string;
    item: string;
    value: number;
  } | null>(null);

  const selectedData = forecastData.find((row) => row.id === selectedRow);

  const calculateTotal = (months: ForecastData["months"]) => {
    return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
  };

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const applyGrowthRate = (
    months: ForecastData["months"],
    growthRate: number
  ) => {
    const monthKeys = Object.keys(months);
    const updatedMonths = { ...months };

    // Find the last actual month
    const lastActualMonth = monthKeys
      .reverse()
      .find((month) => months[month].isActual);

    if (!lastActualMonth) return months;

    const baseValue = months[lastActualMonth].value;
    let currentValue = baseValue;

    // Apply growth rate to forecast months
    monthKeys.forEach((month) => {
      if (!months[month].isActual) {
        currentValue = currentValue * (1 + growthRate);
        updatedMonths[month] = {
          ...months[month],
          value: Math.round(currentValue),
          isManuallyModified: false,
        };
      }
    });

    return updatedMonths;
  };

  const handleLogicChange = (
    event: SelectChangeEvent<string>,
    rowId: string
  ) => {
    event.stopPropagation();
    const newLogic = event.target.value as ForecastLogic;

    const updatedData = forecastData.map((row) => {
      if (row.id === rowId) {
        // If logic is Flat or Custom, handle differently
        if (newLogic === "Flat") {
          const lastActualMonth = Object.entries(row.months).find(
            ([_, data]) => data.isActual
          );
          const flatValue = lastActualMonth ? lastActualMonth[1].value : 0;

          const flatMonths = Object.entries(row.months).reduce(
            (acc, [month, data]) => ({
              ...acc,
              [month]: data.isActual
                ? data
                : {
                    value: flatValue,
                    isActual: false,
                    isManuallyModified: false,
                  },
            }),
            {}
          );

          return {
            ...row,
            forecastLogic: newLogic,
            months: flatMonths,
          };
        }

        if (newLogic === "Custom") {
          return {
            ...row,
            forecastLogic: newLogic,
          };
        }

        // For other logic types, apply growth rate
        const growthRate = getGrowthRate(newLogic) as number;
        return {
          ...row,
          forecastLogic: newLogic,
          months: applyGrowthRate(row.months, growthRate),
        };
      }
      return row;
    });

    updateForecastData(updatedData);
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

  // Add filtering logic
  const filteredData = forecastData.filter((row) => {
    const marketMatch =
      selectedMarkets.length === 0 || selectedMarkets.includes(row.market);
    const itemMatch =
      selectedItems.length === 0 || selectedItems.includes(row.item);
    return marketMatch && itemMatch;
  });

  const handleSidebarSave = (data: ForecastData) => {
    updateSingleForecast(data);
    setSidebarOpen(false);
    setSelectedRow(null); // Clear selection after save
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
  const findBudgetRow = (forecastRow: ForecastData) => {
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
      },
      {
        key: "item",
        header: "ITEM",
        align: "left",
      },
      {
        key: "forecastLogic",
        header: "LOGIC",
        align: "left",
        render: (value: ForecastLogic, row: ForecastData) => (
          <Select
            value={value}
            onChange={(e) => handleLogicChange(e, row.id)}
            onClick={(e) => e.stopPropagation()}
            size="small"
            sx={{
              minWidth: 120,
              fontSize: "inherit",
            }}
          >
            {FORECAST_LOGIC_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        ),
      },
      // Dynamically generate month columns
      ...Object.keys(forecastData[0].months).map((month) => ({
        key: `months.${month}`,
        header: month,
        subHeader: forecastData[0].months[month].isActual ? "ACT" : "FCST",
        align: "right" as const,
        render: (_: any, row: ForecastData) => {
          const data = row.months[month];
          return (
            <div
              onClick={(event) => {
                if (data.isActual) {
                  event.stopPropagation();
                  setSelectedDetails({
                    market: row.market,
                    item: row.item,
                    value: data.value,
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
      })),
      {
        key: "total",
        header: "TOTAL",
        align: "right",
        render: (_: any, row: ForecastData) =>
          calculateTotal(row.months).toLocaleString(),
      },
      {
        key: "budget",
        header: "BUDGET",
        align: "right",
        render: (_: any, row: ForecastData) => {
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
        render: (_: any, row: ForecastData) => {
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
              render: (commentary: string | undefined, _row: ForecastData) =>
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
    [forecastData, hasAnyComments]
  );

  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    setSaveDialogOpen(false);
    setSnackbarOpen(true);
    setForecastName(""); // Reset the forecast name
  };

  const handleSaveCancel = () => {
    setSaveDialogOpen(false);
    setForecastName(""); // Reset the forecast name
  };

  const handlePublish = () => {
    // Add publish logic here
    console.log("Publishing forecast...");
  };

  // Add the sidebar close handler
  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null); // Clear the selected row when sidebar closes
  };

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
        rowsPerPageOptions={[5, 10, 25, { value: -1, label: "All" }]}
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

      <ForecastSidebar
        open={sidebarOpen}
        onClose={handleSidebarClose} // Use the new handler
        selectedData={selectedData}
        onSave={handleSidebarSave}
        forecastLogicOptions={FORECAST_LOGIC_OPTIONS}
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
          item={selectedDetails.item}
          value={selectedDetails.value}
        />
      )}

      <Dialog open={saveDialogOpen} onClose={handleSaveCancel}>
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
          <Button onClick={handleSaveCancel}>Cancel</Button>
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
