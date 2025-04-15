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
  TextField,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";

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
  availableGuidance: Guidance[];
  initialSelectedColumns: Guidance[];
  initialSelectedRows: Guidance[];
  onApplyColumns: (columns: Guidance[]) => void;
  onApplyRows: (rows: Guidance[]) => void;
}

export const GuidanceDialog: React.FC<GuidanceDialogProps> = ({
  open,
  onClose,
  title,
  availableGuidance,
  initialSelectedColumns,
  initialSelectedRows,
  onApplyColumns,
  onApplyRows,
}) => {
  const [selectedColumnGuidance, setSelectedColumnGuidance] = useState<
    Guidance[]
  >(initialSelectedColumns);
  const [selectedRowGuidance, setSelectedRowGuidance] =
    useState<Guidance[]>(initialSelectedRows);
  const [filterText, setFilterText] = useState("");

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

  const filteredGuidanceOptions = availableGuidance.filter((item) => {
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
                        isColSelected ? "Remove from Columns" : "Add to Columns"
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
                      title={isRowSelected ? "Remove from Rows" : "Add to Rows"}
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
