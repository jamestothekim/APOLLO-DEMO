import React from "react";
import {
  ResponsiveChartContainer,
  PiePlot,
  ChartsTooltip,
} from "@mui/x-charts";
import { Box, Typography } from "@mui/material";
import { AggregationResult } from "../../reportBuilder/reportUtil/reportUtil";

interface DashboardPieChartProps {
  aggregationResult: AggregationResult;
  // Need the original config to determine which axis provides labels
  rowDimId: string | null;
  colDimId: string | null;
}

// Helper to format values for the tooltip based on valueFormat
const formatPieValue = (
  value: number | null,
  format: AggregationResult["valueFormat"]
): string => {
  if (value === null || value === undefined) return "N/A";
  try {
    switch (format) {
      case "currency":
        return value.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        });
      case "number":
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      default:
        return value.toString();
    }
  } catch (e) {
    console.error("Error formatting pie value:", value, format, e);
    return value.toString();
  }
};

export const DashboardPieChart: React.FC<DashboardPieChartProps> = ({
  aggregationResult,
  rowDimId,
  colDimId,
}) => {
  const { rows, columns, data, valueFormat } = aggregationResult;

  // Determine which dimension provides the labels for the slices
  const labelDim =
    rowDimId && !colDimId ? "rows" : colDimId && !rowDimId ? "columns" : null;

  if (!labelDim) {
    return (
      <Typography color="error">
        Pie chart requires exactly one dimension.
      </Typography>
    );
  }

  const pieData = (labelDim === "rows" ? rows : columns)
    .map((label, index) => {
      // Get the corresponding value. If rows are labels, value is data[index][0]. If columns are labels, value is data[0][index].
      const value = labelDim === "rows" ? data[index]?.[0] : data[0]?.[index];
      return {
        id: label || `slice-${index}`, // Use label as ID, fallback to index
        value: value ?? 0, // Use 0 for null/undefined values in pie chart
        label: label || "Unknown",
        // Add formatted value for tooltip immediately
        formattedValue: formatPieValue(value, valueFormat),
      };
    })
    .filter((item) => item.value > 0); // Filter out zero/negative values as they don't show well in pie charts

  if (pieData.length === 0) {
    return (
      <Typography color="text.secondary">
        No data available for pie chart.
      </Typography>
    );
  }

  return (
    <Box sx={{ height: "100%", minHeight: 300, p: 1 }}>
      <ResponsiveChartContainer
        series={[
          {
            type: "pie",
            data: pieData,
            // Optional: Make it a Donut chart
            innerRadius: 60,
            outerRadius: 100,
            paddingAngle: 2,
            cornerRadius: 5,
            // Highlight scope allows highlighting related slices on hover
            highlightScope: { faded: "global", highlighted: "item" },
            faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
          },
        ]}
        // Define height based on container, width is automatic
        height={300} // Or adjust as needed
      >
        <PiePlot />
        <ChartsTooltip trigger="item" />{" "}
        {/* Item trigger is standard for pie */}
      </ResponsiveChartContainer>
    </Box>
  );
};
