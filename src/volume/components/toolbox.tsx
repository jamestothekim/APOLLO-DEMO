import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import PublishIcon from "@mui/icons-material/Publish";
import PieChartIcon from "@mui/icons-material/PieChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BuildIcon from "@mui/icons-material/Build";

export type ToolType =
  | "undo"
  | "columns"
  | "export"
  | "viewToggle"
  | "customerToggle"
  | "publish"
  | "pieChart"
  | "lineChart"
  | "configure"
  | "builder";

interface ToolboxProps {
  tools?: ToolType[];
  onUndo: (handler: () => Promise<void>) => void;
  onColumns?: () => void;
  onExport: () => void;
  onViewToggle?: () => void;
  onCustomerToggle?: () => void;
  canUndo: boolean;
  viewType?: "table" | "graph";
  isCustomerView?: boolean;
  isDepletionsView?: boolean;
  canPublish?: boolean;
  onPublish?: () => void;
  canPieChart?: boolean;
  onPieChart?: () => void;
  canLineChart?: boolean;
  onLineChart?: () => void;
  onConfigure?: () => void;
  onBuilder?: () => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  tools = [],
  onUndo,
  onColumns,
  onExport,
  onViewToggle,
  onCustomerToggle,
  canUndo,
  viewType = "table",
  isCustomerView = false,
  canPublish = false,
  onPublish,
  canPieChart = false,
  onPieChart,
  canLineChart = false,
  onLineChart,
  onConfigure,
  onBuilder,
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

  const handlePublish = () => {
    if (onPublish) {
      onPublish();
    }
  };

  const handlePieChart = () => {
    if (onPieChart) {
      onPieChart();
    }
  };

  const handleLineChart = () => {
    if (onLineChart) {
      onLineChart();
    }
  };

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure();
    }
  };

  const handleBuilder = () => {
    if (onBuilder) {
      onBuilder();
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        {tools.includes("customerToggle") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CompareArrowsIcon />}
            onClick={onCustomerToggle}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            {isCustomerView ? "Market View" : "Customer View"}
          </Button>
        )}

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

        {tools.includes("pieChart") && canPieChart && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PieChartIcon />}
            onClick={handlePieChart}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Pie Chart
          </Button>
        )}

        {tools.includes("lineChart") && canLineChart && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShowChartIcon />}
            onClick={handleLineChart}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Line Chart
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
            Guidance
          </Button>
        )}

        {tools.includes("configure") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<LocalShippingIcon />}
            onClick={handleConfigure}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Shipment Logic
          </Button>
        )}

        {tools.includes("builder") && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<BuildIcon />}
            onClick={handleBuilder}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            G. Builder
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
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

        {tools.includes("publish") && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PublishIcon />}
            onClick={handlePublish}
            disabled={!canPublish}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Publish to Dashboard
          </Button>
        )}
      </Box>
    </Box>
  );
};
