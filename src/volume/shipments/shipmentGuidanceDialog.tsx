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

import type { Guidance } from "../../redux/slices/userSettingsSlice";
import { SHIPMENT_GUIDANCE_OPTIONS } from "./shipmentGuidance";

interface ShipmentGuidanceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  initialSelectedColumns: Guidance[];
  initialSelectedRows: Guidance[];
  onApplyColumns: (columns: Guidance[]) => void;
  onApplyRows: (rows: Guidance[]) => void;
}

export const ShipmentGuidanceDialog: React.FC<ShipmentGuidanceDialogProps> = ({
  open,
  onClose,
  title,
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
            SHIPMENT_GUIDANCE_OPTIONS.findIndex((opt) => opt.id === a.id) -
            SHIPMENT_GUIDANCE_OPTIONS.findIndex((opt) => opt.id === b.id)
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
            SHIPMENT_GUIDANCE_OPTIONS.findIndex((opt) => opt.id === a.id) -
            SHIPMENT_GUIDANCE_OPTIONS.findIndex((opt) => opt.id === b.id)
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

  const filteredGuidanceOptions = SHIPMENT_GUIDANCE_OPTIONS.filter((item) => {
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
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};
