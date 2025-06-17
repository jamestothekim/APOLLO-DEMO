import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  TextField,
  IconButton,
  InputAdornment,
  Popover,
} from "@mui/material";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "@mui/material/styles";
import type { ChartOptions } from "chart.js";
import { generateNielsenTrend } from "../scanPlayData/scanDataFn";
import "./scanSidebarProducts";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

// Months constant must match InteractiveGraph ordering
const MONTHS = [
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

interface ScanAnalysisGraphProps {
  /**
   * Name of the currently selected product. When undefined/null the component renders nothing.
   */
  productEntry?: import("./scanSidebarProducts").ProductEntry;
  growthRate: number;
  onGrowthRateChange: (rate: number) => void;
  readOnly?: boolean;
}

// Register chart.js components (local to this file to avoid side-effects)
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ChartTooltip,
  Legend
);

/**
 * Renders a read-only Nielsen LY sales trend beneath the Scan planner panes.
 * For now only the historical line is shown. A projection line will be added later.
 */
const ScanAnalysisGraph: React.FC<ScanAnalysisGraphProps> = ({
  productEntry,
  growthRate,
  onGrowthRateChange,
}) => {
  const theme = useTheme();

  // Growth rate state (as string for input)
  const [growthStr, setGrowthStr] = useState((growthRate * 100).toString());
  const [addingGrowth, setAddingGrowth] = useState(false);
  const [pendingGrowth, setPendingGrowth] = useState(growthStr);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  useEffect(() => {
    // keep local string in sync if parent updates
    setGrowthStr((growthRate * 100).toString());
  }, [growthRate]);
  const rateDecimal = isNaN(parseFloat(growthStr))
    ? 0
    : parseFloat(growthStr) / 100;
  useEffect(() => {
    onGrowthRateChange(rateDecimal);
  }, [rateDecimal]);

  // Derive variant-size display from productName
  const variantDisplay = useMemo(() => {
    if (!productEntry) return "";
    const dashIdx = productEntry.name.indexOf(" - ");
    return dashIdx !== -1
      ? productEntry.name.slice(dashIdx + 3)
      : productEntry.name;
  }, [productEntry]);

  // Use stored trend or generate once (should already exist)
  const nielsenData =
    productEntry?.nielsenTrend || (productEntry ? generateNielsenTrend() : []);

  // Projected values applying growth rate
  const projectedValues = useMemo(
    () =>
      nielsenData.map((d) => Math.round(d.value * (1 + rateDecimal) * 10) / 10),
    [nielsenData, rateDecimal]
  );

  // Prepare dataset
  const lineColor = theme.palette.grey[600] || "#888";
  const projectedColor = theme.palette.primary.main;
  const data = {
    labels: MONTHS,
    datasets: [
      {
        label: "Projected Sales",
        data: projectedValues,
        borderColor: projectedColor,
        backgroundColor: projectedColor + "33",
        pointRadius: 0,
        fill: false,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: "LY Sales Nielsen",
        data: MONTHS.map(
          (m) => nielsenData.find((d) => d.month === m)?.value ?? 0
        ),
        borderColor: lineColor,
        backgroundColor: lineColor + "33",
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // Compute y-axis bounds with some padding
  const allValues = data.datasets.flatMap((ds) => ds.data as number[]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const pad = (max - min) * 0.25 || 10;

  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = Math.round(ctx.parsed.y as number);
            return `${ctx.dataset.label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: Math.max(0, min - pad),
        max: max + pad,
        grid: { display: false },
        ticks: {
          color: "#333",
          precision: 0,
          callback: (tickValue: string | number) => {
            const num =
              typeof tickValue === "string" ? Number(tickValue) : tickValue;
            return Math.round(num).toLocaleString();
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#333" },
      },
    },
  };

  return (
    <Paper
      sx={{
        width: "100%",
        p: 0,
        height: 320,
        maxHeight: 320,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      variant="outlined"
    >
      <Box
        sx={{
          px: 1,
          py: 1,
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        <Typography variant="subtitle2" textAlign="center" sx={{ flexGrow: 1 }}>
          {variantDisplay
            ? `PROJ. SALES (${variantDisplay.toUpperCase()})`
            : "PROJ. SALES"}
        </Typography>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            setAddingGrowth(true);
            setPendingGrowth(growthStr);
            setAnchorEl(e.currentTarget);
          }}
          sx={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          title="Add Growth Rate"
        >
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
        <Popover
          open={addingGrowth}
          anchorEl={anchorEl}
          onClose={() => setAddingGrowth(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              p: 1.5,
              display: "flex",
              alignItems: "center",
              borderRadius: 2,
              boxShadow: 4,
              minWidth: 260,
              maxWidth: 340,
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ mr: 1, whiteSpace: "nowrap" }}>
            Growth Rate
          </Typography>
          <TextField
            size="small"
            type="number"
            value={pendingGrowth}
            onChange={(e) => setPendingGrowth(e.target.value)}
            sx={{ width: 120, mr: 1 }}
            inputProps={{ step: 0.1 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setGrowthStr(pendingGrowth);
                setAddingGrowth(false);
              } else if (e.key === "Escape") {
                setAddingGrowth(false);
              }
            }}
          />
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              color="success"
              onClick={() => {
                setGrowthStr(pendingGrowth);
                setAddingGrowth(false);
              }}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setAddingGrowth(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Popover>
      </Box>
      <Divider />
      <Box
        sx={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          px: 0,
          pt: 0,
          pb: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "stretch",
            p: 1,
            pb: 0,
          }}
        >
          <Line data={data} options={options} height={240} />
        </Box>
      </Box>
    </Paper>
  );
};

export default ScanAnalysisGraph;
