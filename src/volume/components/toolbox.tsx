import React from "react";
import { Box, Button } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DeleteIcon from "@mui/icons-material/Delete";
import PublishIcon from "@mui/icons-material/Publish";
import PieChartIcon from "@mui/icons-material/PieChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useUser } from "../../userContext";
import axios from "axios";

export type ToolType =
  | "undo"
  | "columns"
  | "export"
  | "viewToggle"
  | "customerToggle"
  | "clearRedis"
  | "publish"
  | "pieChart"
  | "lineChart";

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
  isDepletionsView = false,
  canPublish = false,
  onPublish,
  canPieChart = false,
  onPieChart,
  canLineChart = false,
  onLineChart,
}) => {
  const { user } = useUser();

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

  const handleClearRedis = async () => {
    try {
      console.log("Attempting to clear Redis...");
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/redi/clear`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("Redis clear response:", response.data);
    } catch (error) {
      console.error("Failed to clear Redis:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
    }
  };

  const showClearRedis =
    user?.email === "james@illysium.ai" && isDepletionsView;

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

        {showClearRedis && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleClearRedis}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Clear Redis
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
