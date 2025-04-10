import React, { useState, useEffect } from "react";
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
  CircularProgress,
  TextField,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import axios from "axios";
import { useUser } from "../../userContext";

export interface Guidance {
  id: number;
  label: string;
  sublabel?: string;
  value:
    | string
    | {
        numerator?: string;
        denominator?: string;
        expression?: string;
      };
  calculation: {
    type: "direct" | "percentage" | "difference";
    format?: "number" | "percent";
  };
}

interface GuidanceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onApplyColumns: (columns: Guidance[]) => void;
  onApplyRows: (rows: Guidance[]) => void;
}

export const GuidanceDialog: React.FC<GuidanceDialogProps> = ({
  open,
  onClose,
  title,
  onApplyColumns,
  onApplyRows,
}) => {
  const { user } = useUser();
  const [allGuidanceOptions, setAllGuidanceOptions] = useState<Guidance[]>([]);
  const [selectedColumnGuidance, setSelectedColumnGuidance] = useState<
    Guidance[]
  >([]);
  const [selectedRowGuidance, setSelectedRowGuidance] = useState<Guidance[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (open) {
      fetchGuidance();
    }
  }, [open]);

  useEffect(() => {
    if (open && user?.user_settings && allGuidanceOptions.length > 0) {
      loadUserGuidancePreferences();
    }
  }, [open, user?.user_settings, allGuidanceOptions]);

  const fetchGuidance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-benchmarks`
      );
      setAllGuidanceOptions(response.data);
    } catch (error) {
      console.error("Error fetching guidance options:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGuidancePreferences = () => {
    if (!user?.user_settings || allGuidanceOptions.length === 0) return;

    const { guidance_columns, guidance_rows } = user.user_settings;

    // Load Column Preferences
    if (guidance_columns && Array.isArray(guidance_columns)) {
      const userSelectedColumns = guidance_columns
        .map((id) => allGuidanceOptions.find((g) => g.id === id))
        .filter(Boolean) as Guidance[];
      // Maintain the order from user_settings when loading
      setSelectedColumnGuidance(userSelectedColumns);
    }

    // Load Row Preferences
    if (guidance_rows && Array.isArray(guidance_rows)) {
      const userSelectedRows = guidance_rows
        .map((id) => allGuidanceOptions.find((g) => g.id === id))
        .filter(Boolean) as Guidance[];
      // Maintain the order from user_settings when loading
      setSelectedRowGuidance(userSelectedRows);
    }
  };

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
        // Add new item while preserving original order from allGuidanceOptions
        newSelection = [...selectedColumnGuidance, item].sort(
          (a, b) =>
            allGuidanceOptions.findIndex((opt) => opt.id === a.id) -
            allGuidanceOptions.findIndex((opt) => opt.id === b.id)
        );
      }
      setSelectedColumnGuidance(newSelection);
    } else {
      // type === 'rows'
      const isCurrentlySelected = isSelected(item, "rows");
      let newSelection: Guidance[];
      if (isCurrentlySelected) {
        newSelection = selectedRowGuidance.filter((g) => g.id !== item.id);
      } else {
        // Add new item while preserving original order from allGuidanceOptions
        newSelection = [...selectedRowGuidance, item].sort(
          (a, b) =>
            allGuidanceOptions.findIndex((opt) => opt.id === a.id) -
            allGuidanceOptions.findIndex((opt) => opt.id === b.id)
        );
      }
      setSelectedRowGuidance(newSelection);
    }
  };

  const handleApply = async () => {
    console.log("Applying Columns:", selectedColumnGuidance);
    console.log("Applying Rows:", selectedRowGuidance);
    onApplyColumns(selectedColumnGuidance);
    onApplyRows(selectedRowGuidance);

    // Saving logic now happens in VolumeForecast component using updateUserSettings
    // if (user) {
    //   try {
    //     const columnBenchmarkIds = selectedColumnGuidance.map(
    //       (benchmark) => benchmark.id
    //     );
    //     await saveGuidancePreferences(columnBenchmarkIds); // This function likely needs update/removal
    //   } catch (error) {
    //     console.error("Error saving column benchmark preferences:", error);
    //   }
    // }
    onClose();
  };

  const filteredGuidanceOptions = allGuidanceOptions.filter((item) => {
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

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
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
                          isColSelected
                            ? "Remove from Columns"
                            : "Add to Columns"
                        }
                      >
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => handleToggle(item, "columns")}
                        >
                          {isColSelected ? (
                            <ViewColumnIcon fontSize="small" color="primary" />
                          ) : (
                            <ViewColumnOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          isRowSelected ? "Remove from Rows" : "Add to Rows"
                        }
                      >
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => handleToggle(item, "rows")}
                          sx={{ ml: 0.25 }}
                        >
                          {isRowSelected ? (
                            <ViewHeadlineOutlinedIcon
                              fontSize="small"
                              color="primary"
                            />
                          ) : (
                            <ViewHeadlineOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};
