import {
  Drawer,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  Grid,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import { useState, useMemo } from "react";
import { InteractiveGraph } from "./interactiveGraph";
import { MonthlyValues } from "./monthlyValues";

interface MonthData {
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface MonthGroup {
  label: string;
  months: string[];
}

// Interface for benchmark forecasts
export interface BenchmarkForecastOption {
  id: number;
  label: string;
  value: string;
  color: string;
  calculation?: {
    type: "difference" | "percentage";
    format?: "number" | "percent";
    expression?: string;
    numerator?: string;
    denominator?: string;
  };
}

interface QuantSidebarProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: string | number;
  // Data props
  marketName?: string;
  customerName?: string;
  productName?: string;
  forecastLogic?: string;
  forecastOptions?: Array<{ id: number; label: string; value: string }>;
  onForecastLogicChange?: (newLogic: string) => void;
  // Graph props
  graphData?: Array<{
    id: string;
    label: string;
    data: Array<{ month: string; value: number }>;
    color: string;
  }>;
  // Benchmark props
  benchmarkForecasts?: BenchmarkForecastOption[];
  availableBenchmarkData?: Record<string, number[]>;
  // Hover metrics
  hoverMetrics?: Record<string, Record<string, number | string>>;
  // Monthly values props
  months: {
    [key: string]: MonthData;
  };
  onMonthValueChange: (month: string, value: string) => void;
  // Commentary
  commentary?: string;
  onCommentaryChange?: (value: string) => void;
  // Footer buttons
  footerButtons?: Array<{
    label: string;
    onClick: () => void;
    variant: "text" | "outlined" | "contained";
    disabled?: boolean;
  }>;
}

// Fixed quarter groups for the sidebar
const QUARTER_GROUPS: MonthGroup[] = [
  { label: "Q1", months: ["JAN", "FEB", "MAR"] },
  { label: "Q2", months: ["APR", "MAY", "JUN"] },
  { label: "Q3", months: ["JUL", "AUG", "SEP"] },
  { label: "Q4", months: ["OCT", "NOV", "DEC"] },
];

export const QuantSidebar = ({
  open,
  onClose,
  title = "Forecast Details",
  width = "600px",
  marketName,
  customerName,
  productName,
  forecastLogic,
  forecastOptions,
  onForecastLogicChange,
  graphData = [],
  benchmarkForecasts = [],
  availableBenchmarkData = {},
  months,
  onMonthValueChange,
  commentary,
  onCommentaryChange,
  footerButtons = [],
}: QuantSidebarProps) => {
  const [selectedTrendLines, setSelectedTrendLines] = useState<string[]>([]);

  // Generate trend lines from benchmark options
  const trendLines = useMemo(() => {
    if (!graphData.length || !benchmarkForecasts.length) return [];

    const baseData = graphData[0].data;
    const months = baseData.map((item) => item.month);

    return benchmarkForecasts.map((benchmark) => {
      // For direct value benchmarks (like py_case_equivalent_volume, gross_sales_value)
      if (!benchmark.calculation) {
        // Get the benchmark data values from availableBenchmarkData
        const benchmarkValues = availableBenchmarkData[benchmark.value] || [];

        // Map the data to match the format expected by the graph
        const data = months.map((month, index) => ({
          month,
          value: benchmarkValues[index] || 0,
        }));

        return {
          id: benchmark.value,
          label: benchmark.label,
          data,
          color: benchmark.color,
        };
      }
      // For calculated benchmarks (like differences or percentages)
      else {
        const calculation = benchmark.calculation; // Store reference to avoid null checks
        // Get the values for calculation
        const tyValues = availableBenchmarkData["case_equivalent_volume"] || [];
        const lyValues =
          availableBenchmarkData["py_case_equivalent_volume"] || [];
        const tyGsvValues = availableBenchmarkData["gross_sales_value"] || [];
        const lyGsvValues =
          availableBenchmarkData["py_gross_sales_value"] || [];

        // Map the data with calculated values
        const data = months.map((month, index) => {
          let value = 0;

          if (calculation.type === "difference" && calculation.expression) {
            // Parse and evaluate the expression (e.g., "case_equivalent_volume - py_case_equivalent_volume")
            const parts = calculation.expression.split(" - ");
            const minuend =
              parts[0] === "case_equivalent_volume"
                ? tyValues[index] || 0
                : parts[0] === "gross_sales_value"
                ? tyGsvValues[index] || 0
                : 0;
            const subtrahend =
              parts[1] === "py_case_equivalent_volume"
                ? lyValues[index] || 0
                : parts[1] === "py_gross_sales_value"
                ? lyGsvValues[index] || 0
                : 0;

            value = minuend - subtrahend;
          } else if (
            calculation.type === "percentage" &&
            calculation.numerator &&
            calculation.denominator
          ) {
            // Handle percentage calculations
            const numeratorParts = calculation.numerator.split(" - ");
            const numerValue1 =
              numeratorParts[0] === "case_equivalent_volume"
                ? tyValues[index] || 0
                : numeratorParts[0] === "gross_sales_value"
                ? tyGsvValues[index] || 0
                : 0;
            const numerValue2 =
              numeratorParts[1] === "py_case_equivalent_volume"
                ? lyValues[index] || 0
                : numeratorParts[1] === "py_gross_sales_value"
                ? lyGsvValues[index] || 0
                : 0;

            const numerator = numerValue1 - numerValue2;

            const denominator =
              calculation.denominator === "py_case_equivalent_volume"
                ? lyValues[index] || 0
                : calculation.denominator === "py_gross_sales_value"
                ? lyGsvValues[index] || 0
                : 0;

            // Calculate the percentage, avoiding division by zero
            value = denominator !== 0 ? numerator / denominator : 0;
          }

          return {
            month,
            value,
          };
        });

        return {
          id: benchmark.value,
          label: benchmark.label,
          data,
          color: benchmark.color,
        };
      }
    });
  }, [graphData, benchmarkForecasts, availableBenchmarkData]);

  // Combine base graph data with selected trend lines
  const combinedGraphData = useMemo(() => {
    if (!graphData.length) return [];

    const selectedTrendLineData = trendLines
      .filter((tl) => selectedTrendLines.includes(tl.id))
      .map((tl) => ({
        id: tl.id,
        label: tl.label,
        data: tl.data,
        color: tl.color,
      }));

    return [...graphData, ...selectedTrendLineData];
  }, [graphData, trendLines, selectedTrendLines]);

  const handleTrendLineAdd = (trendLineId: string) => {
    setSelectedTrendLines((prev) => [...prev, trendLineId]);
  };

  const handleTrendLineRemove = (trendLineId: string) => {
    setSelectedTrendLines((prev) => prev.filter((id) => id !== trendLineId));
  };

  const calculateTotal = () => {
    return Object.values(months).reduce(
      (acc, curr: MonthData) => acc + curr.value,
      0
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width,
          backgroundColor: "background.paper",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ p: 3, flex: 1, overflow: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {(marketName || customerName) && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {customerName ? "Customer:" : "Market:"}
                </Typography>
                <Typography>{customerName || marketName}</Typography>
              </Box>
            </Grid>
          )}

          {productName && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>Item:</Typography>
                <Typography>{productName}</Typography>
              </Box>
            </Grid>
          )}

          {forecastLogic && forecastOptions && onForecastLogicChange && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>Logic:</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={forecastLogic}
                    onChange={(e) => onForecastLogicChange(e.target.value)}
                  >
                    {forecastOptions.map((option) => (
                      <MenuItem key={option.id} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <InteractiveGraph
              datasets={combinedGraphData}
              availableTrendLines={trendLines}
              onTrendLineAdd={handleTrendLineAdd}
              onTrendLineRemove={handleTrendLineRemove}
              primaryLabel="Primary Forecast"
              label="FORECAST TREND"
            />
          </Grid>

          <Grid item xs={12}>
            <MonthlyValues
              quarterGroups={QUARTER_GROUPS.map(
                ({ label, months: monthList }) => ({
                  label,
                  months: monthList.map((month) => ({
                    month,
                    value: months[month]?.value || 0,
                    isActual: months[month]?.isActual || false,
                    isManuallyModified:
                      months[month]?.isManuallyModified || false,
                  })),
                })
              )}
              onMonthValueChange={onMonthValueChange}
              label="MONTHLY VALUES"
              defaultExpanded={true}
            />
          </Grid>

          {onCommentaryChange !== undefined && (
            <Grid item xs={12}>
              <TextField
                label="Commentary"
                multiline
                rows={3}
                fullWidth
                value={commentary || ""}
                onChange={(e) => onCommentaryChange(e.target.value)}
                placeholder="Add your comments here..."
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Total:</Typography>
              <Typography variant="h6">
                {calculateTotal().toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {footerButtons.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          {footerButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant}
              onClick={button.onClick}
              disabled={button.disabled}
              sx={{ minWidth: "120px" }}
            >
              {button.label}
            </Button>
          ))}
        </Box>
      )}
    </Drawer>
  );
};
