import React from "react";
import {
  ResponsiveChartContainer,
  LinePlot,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip,
  ChartsGrid,
  ChartsAxisHighlight,
} from "@mui/x-charts";
import { Box, Typography } from "@mui/material";
import {
  AggregationResult,
  TIME_SERIES_DIMENSION_IDS,
  AVAILABLE_DIMENSIONS,
} from "../../reportBuilder/reportUtil/reportUtil";

interface DashboardLineChartProps {
  aggregationResult: AggregationResult;
  // Need the original config to determine which axis is time
  rowDimId: string | null;
  colDimId: string | null;
}

// Helper to format values for the axis/tooltip based on valueFormat
const formatChartValue = (
  value: number | null,
  format: AggregationResult["valueFormat"]
): string => {
  if (value === null || value === undefined) return "-";
  try {
    switch (format) {
      case "currency":
        return value.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0, // Often cleaner for charts
        });
      case "number":
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      default:
        return value.toString();
    }
  } catch (e) {
    console.error("Error formatting chart value:", value, format, e);
    return value.toString();
  }
};

// Add a helper function for proper case formatting
const toProperCase = (str: string): string => {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

export const DashboardLineChart: React.FC<DashboardLineChartProps> = ({
  aggregationResult,
  rowDimId,
  colDimId,
}) => {
  const { rows, columns, data, valueFormat } = aggregationResult;

  // Determine which dimension is the time series (X-axis)
  const xAxisDim = TIME_SERIES_DIMENSION_IDS.includes(rowDimId || "")
    ? "rows"
    : TIME_SERIES_DIMENSION_IDS.includes(colDimId || "")
    ? "columns"
    : null;

  // Get the actual dimension labels
  const getDimensionLabel = (dimId: string | null): string => {
    if (!dimId) return "";
    const dimension = AVAILABLE_DIMENSIONS.find((d) => d.id === dimId);
    return dimension?.label || "";
  };

  const xAxisLabel = getDimensionLabel(
    xAxisDim === "rows" ? rowDimId : colDimId
  );
  const yAxisDimension = AVAILABLE_DIMENSIONS.find(
    (d) => d.type === "measure" && d.format === valueFormat
  );
  const yAxisLabel = yAxisDimension?.label || "";

  if (!xAxisDim) {
    return (
      <Typography color="error">
        Line chart requires a time dimension (Month, Year).
      </Typography>
    );
  }

  const xAxisData = xAxisDim === "rows" ? rows : columns;
  const seriesData =
    xAxisDim === "rows"
      ? columns.map((colLabel, colIndex) => ({
          id: colLabel || `series-${colIndex}`,
          label: colLabel || `Series ${colIndex + 1}`,
          data: rows.map(
            (_rowLabel, rowIndex) => data[rowIndex]?.[colIndex] ?? null
          ),
        }))
      : rows.map((rowLabel, rowIndex) => ({
          id: rowLabel || `series-${rowIndex}`,
          label: rowLabel || `Series ${rowIndex + 1}`,
          data: columns.map(
            (_colLabel, colIndex) => data[rowIndex]?.[colIndex] ?? null
          ),
        }));

  if (!xAxisData || xAxisData.length === 0 || seriesData.length === 0) {
    return (
      <Typography color="text.secondary">
        No data available for line chart.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: 2,
      }}
    >
      {/* Main row with y-label and chart */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          minHeight: "300px",
          width: "100%",
        }}
      >
        {/* Y-axis label container */}
        <Box
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            textAlign: "center",
            marginRight: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {yAxisLabel}
            {valueFormat === "currency" ? " (USD)" : ""}
          </Typography>
        </Box>

        {/* Chart container */}
        <Box sx={{ flexGrow: 1 }}>
          <ResponsiveChartContainer
            height={400}
            series={seriesData.map((s) => ({
              ...s,
              type: "line",
              valueFormatter: (v) => formatChartValue(v, valueFormat),
            }))}
            xAxis={[
              {
                id: "x-axis",
                data: xAxisData.map((label) => toProperCase(label || "")),
                scaleType: "band",
                tickLabelStyle: {
                  angle: 45,
                  textAnchor: "start",
                },
              },
            ]}
            yAxis={[
              {
                id: "y-axis",
                valueFormatter: (value) => formatChartValue(value, valueFormat),
                tickLabelStyle: {
                  transform: "translateX(-5px)",
                },
              },
            ]}
            margin={{ top: 20, right: 20, bottom: 40, left: 70 }}
          >
            <ChartsGrid horizontal />
            <LinePlot />
            <ChartsTooltip
              trigger="axis"
              slotProps={{
                popper: {
                  sx: {
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    borderRadius: 1,
                    p: 1,
                  },
                },
              }}
            />
            <ChartsAxisHighlight x="line" />
            <ChartsXAxis position="bottom" axisId="x-axis" />
            <ChartsYAxis position="left" axisId="y-axis" />
          </ResponsiveChartContainer>
        </Box>
      </Box>

      {/* X-axis label container */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          marginTop: 1,
          marginLeft: 8,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {xAxisLabel}
        </Typography>
      </Box>
    </Box>
  );
};
