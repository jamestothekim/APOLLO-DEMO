import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import axios from "axios";

// Import Guidance type from the Redux slice
import type { Guidance } from "../../redux/slices/userSettingsSlice";

// START ADDED IMPORTS
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store"; // Assuming RootState is exported from your store
// Assuming selectors exist in userSettingsSlice.ts, e.g.:
// import {
//   selectSelectedForecastColIds,
//   selectSelectedForecastRowIds,
//   selectSelectedSummaryColIds,
//   selectSelectedSummaryRowIds
// } from "../../redux/slices/userSettingsSlice";
// END ADDED IMPORTS

interface GuidanceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  availableGuidance: Guidance[];
  initialSelectedColumns: Guidance[];
  initialSelectedRows: Guidance[];
  onApplyColumns: (columns: Guidance[]) => void;
  onApplyRows: (rows: Guidance[]) => void;
  viewContext: "summary" | "depletions";
}

// Helper to get token
const getToken = () => {
  return localStorage.getItem("token");
};

export const GuidanceDialog: React.FC<GuidanceDialogProps> = ({
  open,
  onClose,
  title,
  availableGuidance,
  initialSelectedColumns,
  initialSelectedRows,
  onApplyColumns,
  onApplyRows,
  viewContext,
}) => {
  const [selectedColumnGuidance, setSelectedColumnGuidance] = useState<
    Guidance[]
  >(initialSelectedColumns);
  const [selectedRowGuidance, setSelectedRowGuidance] =
    useState<Guidance[]>(initialSelectedRows);
  const [filterText, setFilterText] = useState("");
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // START ADDED SELECTORS - Replace with your actual selectors
  const {
    selectedForecastColIds,
    selectedForecastRowIds,
    selectedSummaryColIds,
    selectedSummaryRows,
  } = useSelector((state: RootState) => {
    // This is a placeholder. Replace with actual selectors from userSettingsSlice.ts
    // Ensure these selectors return number[] or a default empty array.
    const settings = (state as any).userSettings; // Accessing userSettings slice, adjust path if needed
    return {
      selectedForecastColIds: settings?.selectedForecastCols || [],
      selectedForecastRowIds: settings?.selectedForecastRows || [],
      selectedSummaryColIds: settings?.selectedSummaryCols || [],
      selectedSummaryRows: settings?.selectedSummaryRows || [],
    };
  });
  // END ADDED SELECTORS

  useEffect(() => {
    if (open) {
      setSelectedColumnGuidance(initialSelectedColumns);
      setSelectedRowGuidance(initialSelectedRows);
      setFilterText("");
    }
  }, [open, initialSelectedColumns, initialSelectedRows]);

  const isSelected = (item: Guidance, type: "columns" | "rows") => {
    if (type === "columns") {
      return selectedColumnGuidance.some((g) => g.id === item.id);
    } else {
      return selectedRowGuidance.some((g) => g.id === item.id);
    }
  };

  const handleToggle = (item: Guidance, type: "columns" | "rows") => {
    if (type === "columns") {
      const isCurrentlySelected = isSelected(item, "columns");
      let newSelection: Guidance[];
      if (isCurrentlySelected) {
        newSelection = selectedColumnGuidance.filter((g) => g.id !== item.id);
      } else {
        newSelection = [...selectedColumnGuidance, item].sort(
          (a, b) =>
            availableGuidance.findIndex((opt) => opt.id === a.id) -
            availableGuidance.findIndex((opt) => opt.id === b.id)
        );
      }
      setSelectedColumnGuidance(newSelection);
    } else {
      const isCurrentlySelected = isSelected(item, "rows");
      let newSelection: Guidance[];
      if (isCurrentlySelected) {
        newSelection = selectedRowGuidance.filter((g) => g.id !== item.id);
      } else {
        newSelection = [...selectedRowGuidance, item].sort(
          (a, b) =>
            availableGuidance.findIndex((opt) => opt.id === a.id) -
            availableGuidance.findIndex((opt) => opt.id === b.id)
        );
      }
      setSelectedRowGuidance(newSelection);
    }
  };

  const handleApply = async () => {
    onApplyColumns(selectedColumnGuidance);
    onApplyRows(selectedRowGuidance);
    onClose();
  };

  // Handler for the new Make Default button
  const handleMakeDefault = useCallback(async () => {
    setIsSavingDefault(true);
    const currentViewColumnIds = selectedColumnGuidance.map((c) => c.id);
    const currentViewRowIds = selectedRowGuidance.map((r) => r.id);
    const token = getToken();

    if (!token) {
      console.error("Make Default Error: No auth token found.");
      setIsSavingDefault(false);
      // Consider adding user feedback here (e.g., snackbar)
      return;
    }

    const isSummaryView = viewContext === "summary";

    // Construct the complete guidance_settings object
    const completeGuidanceSettings = {
      summary_cols: isSummaryView
        ? currentViewColumnIds
        : selectedSummaryColIds,
      summary_rows: isSummaryView ? currentViewRowIds : selectedSummaryRows,
      forecast_cols: !isSummaryView
        ? currentViewColumnIds
        : selectedForecastColIds,
      forecast_rows: !isSummaryView
        ? currentViewRowIds
        : selectedForecastRowIds,
    };

    const payload = {
      guidance_settings: completeGuidanceSettings,
    };

    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/users/sync-settings`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optional: Show success feedback (e.g., snackbar)
      setSnackbarMessage("Guidance settings have been set as default");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Failed to save default guidance settings:", error);
      // Optional: Show error feedback (e.g., snackbar)
    } finally {
      setIsSavingDefault(false);
    }
  }, [
    selectedColumnGuidance,
    selectedRowGuidance,
    viewContext,
    selectedForecastColIds,
    selectedForecastRowIds,
    selectedSummaryColIds,
    selectedSummaryRows,
  ]);

  const filteredGuidanceOptions = availableGuidance
    // Filter by view context first
    .filter(
      (item) =>
        item.availability === viewContext || item.availability === "both"
    )
    // Then filter by text input
    .filter((item) => {
      const lowerFilter = filterText.toLowerCase();
      const labelMatch = item.label.toLowerCase().includes(lowerFilter);
      const sublabelMatch =
        item.sublabel?.toLowerCase().includes(lowerFilter) || false;
      return labelMatch || sublabelMatch;
    });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent
        sx={{
          borderTop: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ mt: 1, mb: 1.5 }}>
          <TextField
            label="Filter Guidance"
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            fullWidth
          />
        </Box>

        <List
          dense
          sx={{
            maxHeight: "250px",
            overflowY: "auto",
          }}
        >
          {filteredGuidanceOptions.length > 0 ? (
            filteredGuidanceOptions.map((item) => {
              const isColSelected = isSelected(item, "columns");
              const isRowSelected = isSelected(item, "rows");
              const canSelectColumn =
                item.displayType === "column" || item.displayType === "both";
              const canSelectRow =
                item.displayType === "row" || item.displayType === "both";
              return (
                <ListItem key={item.id} disablePadding sx={{ paddingY: 0.5 }}>
                  <ListItemText
                    primary={item.label}
                    secondary={item.sublabel || null}
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip
                      title={
                        canSelectColumn
                          ? isColSelected
                            ? "Remove from Columns"
                            : "Add to Columns"
                          : "Not applicable for Columns"
                      }
                    >
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => handleToggle(item, "columns")}
                        disabled={!canSelectColumn}
                      >
                        {isColSelected ? (
                          <ViewColumnIcon fontSize="small" color="primary" />
                        ) : (
                          <ViewColumnOutlinedIcon
                            fontSize="small"
                            color={canSelectColumn ? undefined : "disabled"}
                          />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={
                        canSelectRow
                          ? isRowSelected
                            ? "Remove from Rows"
                            : "Add to Rows"
                          : "Not applicable for Rows"
                      }
                    >
                      <span style={{ marginLeft: "0.25rem" }}>
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => handleToggle(item, "rows")}
                          disabled={!canSelectRow}
                        >
                          {isRowSelected ? (
                            <ViewHeadlineOutlinedIcon
                              fontSize="small"
                              color="primary"
                            />
                          ) : (
                            <ViewHeadlineOutlinedIcon
                              fontSize="small"
                              color={canSelectRow ? undefined : "disabled"}
                            />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })
          ) : (
            <ListItem>
              <ListItemText
                primary="No guidance options match your filter."
                primaryTypographyProps={{
                  variant: "body2",
                  align: "center",
                  color: "text.secondary",
                }}
              />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleMakeDefault}
          variant="outlined"
          disabled={isSavingDefault}
        >
          {isSavingDefault ? "Saving..." : "Make Default"}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};
