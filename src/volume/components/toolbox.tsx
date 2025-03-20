import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";

export type ToolType = "undo" | "columns" | "export" | "viewToggle";

interface ToolboxProps {
  tools?: ToolType[];
  onUndo: (handler: () => Promise<void>) => void;
  onColumns?: () => void;
  onExport: () => void;
  onViewToggle?: () => void;
  canUndo: boolean;
  viewType?: "table" | "graph";
}

export const Toolbox: React.FC<ToolboxProps> = ({
  tools = [],
  onUndo,
  onColumns,
  onExport,
  onViewToggle,
  canUndo,
  viewType = "table",
}) => {
  const handleUndo = async () => {
    if (onUndo) {
      try {
        await onUndo(() => Promise.resolve());
      } catch (error) {
        console.error("Failed to undo:", error);
      }
    }
  };

  const handleColumns = () => {
    if (onColumns) {
      onColumns();
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        {tools.includes("viewToggle") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={
              viewType === "table" ? <BarChartIcon /> : <TableChartIcon />
            }
            onClick={onViewToggle}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            {viewType === "table" ? "Show Graph" : "Show Table"}
          </Button>
        )}

        {tools.includes("undo") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<UndoIcon />}
            onClick={handleUndo}
            disabled={!canUndo}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Undo
          </Button>
        )}

        {tools.includes("columns") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewColumnIcon />}
            onClick={handleColumns}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            +/- Columns
          </Button>
        )}
      </Box>

      {tools.includes("export") && (
        <Button
          variant="contained"
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          Export CSV
        </Button>
      )}
    </Box>
  );
};
