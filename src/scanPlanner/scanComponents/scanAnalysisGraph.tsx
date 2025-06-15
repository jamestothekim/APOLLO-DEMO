import React, { useMemo, useState, useEffect } from "react";
import { Box, Paper, Typography, Divider, TextField } from "@mui/material";
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
  readOnly = false,
}) => {
  const theme = useTheme();

  // Growth rate state (as string for input)
  const [growthStr, setGrowthStr] = useState((growthRate * 100).toString());
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
  const nielsenData = productEntry?.nielsenTrend || generateNielsenTrend();

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
        sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5, gap: 1 }}
      >
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {variantDisplay} - Projected Sales
        </Typography>
        {/* Growth Rate Input */}
        <TextField
          label="Growth %"
          size="small"
          type="number"
          value={growthStr}
          onChange={(e) => setGrowthStr(e.target.value)}
          sx={{ width: 100 }}
          inputProps={{ step: 0.1 }}
          disabled={readOnly}
        />
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, position: "relative", overflow: "auto" }}>
        {productEntry ? (
          <Line data={data} options={options} />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Select a product to view projected sales
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ScanAnalysisGraph;
