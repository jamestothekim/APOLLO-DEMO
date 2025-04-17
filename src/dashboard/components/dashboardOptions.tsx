import React, { useState } from "react";
import {
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import DeleteIcon from "@mui/icons-material/Delete";

interface DashboardOptionsProps {
  onViewAsTable?: () => void;
  onViewAsLine?: () => void;
  onViewAsPie?: () => void;
  canShowPieChart?: boolean;
  canShowLineChart?: boolean;
  onDelete?: () => void;
  selectedView?: "table" | "line" | "pie";
  // Add props to control visibility/disabling later if needed
  // e.g., canViewAsLine?: boolean;
}

export const DashboardOptions: React.FC<DashboardOptionsProps> = ({
  onViewAsTable,
  onViewAsLine,
  onViewAsPie,
  canShowPieChart,
  canShowLineChart,
  onDelete,
  selectedView,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    if (onDelete) {
      onDelete();
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Stack direction="row" spacing={0} alignItems="center">
        {/* Table View Button - Render if handler exists */}
        {onViewAsTable && (
          <IconButton
            aria-label="View as Table"
            onClick={onViewAsTable}
            size="medium"
            sx={{
              color:
                selectedView === "table" ? "primary.main" : "text.secondary",
            }}
          >
            <TableChartIcon fontSize="medium" />
          </IconButton>
        )}
        {/* Line Chart Button - Render if handler exists AND condition is met */}
        {onViewAsLine && canShowLineChart && (
          <IconButton
            aria-label="View as Line Chart"
            onClick={onViewAsLine}
            size="medium"
            sx={{
              color:
                selectedView === "line" ? "primary.main" : "text.secondary",
            }}
          >
            <ShowChartIcon fontSize="medium" />
          </IconButton>
        )}
        {/* Pie Chart Button - Render if handler exists AND condition is met */}
        {onViewAsPie && canShowPieChart && (
          <IconButton
            aria-label="View as Pie Chart"
            onClick={onViewAsPie}
            size="medium"
            sx={{
              color: selectedView === "pie" ? "primary.main" : "text.secondary",
            }}
          >
            <PieChartIcon fontSize="medium" />
          </IconButton>
        )}
        {/* Delete Button - Render if handler exists */}
        {onDelete && (
          <IconButton
            aria-label="Delete report"
            onClick={handleDeleteClick}
            size="medium"
            sx={{ color: (theme) => theme.palette.error.main }}
          >
            <DeleteIcon fontSize="medium" />
          </IconButton>
        )}
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this report? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
