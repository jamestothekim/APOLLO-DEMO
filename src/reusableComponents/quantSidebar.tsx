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
import { useMemo, useEffect, useRef } from "react";
import { InteractiveGraph } from "./interactiveGraph";
import { MonthlyValues } from "./monthlyValues";
import { formatGuidanceValue } from "../volume/calculations/guidanceCalculations";
import { useDispatch, useSelector } from "react-redux";
import {
  setMonths,
  updateMonthValue,
  setSelectedTrendLines,
} from "../redux/slices/sidebarSlice";
import type { RootState } from "../redux/store";

interface MonthData {
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface MonthGroup {
  label: string;
  months: string[];
}

// Interface for guidance forecasts
export interface GuidanceForecastOption {
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
  sublabel?: string;
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
  // Guidance props
  guidanceForecasts?: GuidanceForecastOption[];
  availableGuidanceData?: Record<string, number[]>;
  // Hover metrics
  hoverMetrics?: Record<string, Record<string, number | string>>;
  // Monthly values props
  months: {
    [key: string]: MonthData;
  };
  onMonthValueChange: (month: string, value: string) => void;
  // GSV rate props
  gsvRate?: number;
  // Add prop for Total LY Volume
  pyTotalVolume?: number;
  // Shipment-specific guidance summary props
  shipmentGuidanceSummary?: {
    tyForecast: number;
    lyActual: number;
    inventory: number;
    currentDDOI: number;
    leadTimes: number;
  };
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
  guidanceForecasts = [],
  availableGuidanceData = {},
  months: initialMonths,
  onMonthValueChange,
  gsvRate,
  pyTotalVolume,
  shipmentGuidanceSummary,
  commentary,
  onCommentaryChange,
  footerButtons = [],
}: QuantSidebarProps) => {
  const dispatch = useDispatch();
  const { months, total, selectedTrendLines } = useSelector(
    (state: RootState) => state.sidebar
  );

  // Store the original months as a stable ref for edit icon comparison
  const originalMonthsRef = useRef<{ [key: string]: MonthData } | null>(null);
  useEffect(() => {
    if (open) {
      // Only set on open, and only if not already set
      if (!originalMonthsRef.current) {
        originalMonthsRef.current = JSON.parse(JSON.stringify(initialMonths));
      }
    } else {
      // Reset when sidebar closes
      originalMonthsRef.current = null;
    }
  }, [open, initialMonths]);
  const originalMonths = originalMonthsRef.current || {};

  // Initialize Redux state when component mounts or initialMonths changes
  useEffect(() => {
    if (initialMonths) {
      dispatch(setMonths(initialMonths));
    }
  }, [initialMonths, dispatch]);

  // Calculate derived yearly guidance metrics
  const yearlyGuidance = useMemo(() => {
    if (typeof pyTotalVolume !== "number" || pyTotalVolume <= 0) {
      return null;
    }
    const delta = total - pyTotalVolume;
    const percentChange = delta / pyTotalVolume;
    return {
      delta,
      percentChange,
    };
  }, [total, pyTotalVolume]);

  // Generate trend lines from guidance options
  const trendLines = useMemo(() => {
    if (!graphData.length || !guidanceForecasts.length) return [];

    const baseData = graphData[0].data;
    const months = baseData.map((item) => item.month);
    const tyValues = baseData.map((item) => item.value || 0);

    return guidanceForecasts.map((guidanceOption) => {
      const combinedLabel = guidanceOption.sublabel
        ? `${guidanceOption.label} (${guidanceOption.sublabel})`
        : guidanceOption.label;
      // For direct value guidance (like py_case_equivalent_volume, gross_sales_value)
      if (!guidanceOption.calculation) {
        // Get the guidance data values from availableGuidanceData
        const guidanceValues =
          availableGuidanceData[guidanceOption.value] || [];

        // Map the data to match the format expected by the graph
        const data = months.map((month, index) => ({
          month,
          value: guidanceValues[index] || 0,
        }));

        return {
          id: guidanceOption.value,
          label: combinedLabel,
          data,
          color: guidanceOption.color,
        };
      }
      // For calculated guidance (like differences or percentages)
      else {
        const calculation = guidanceOption.calculation;
        // Get the guidance values for calculation
        const lyValues =
          availableGuidanceData["py_case_equivalent_volume"] || [];
        const tyGsvValues = availableGuidanceData["gross_sales_value"] || [];
        const lyGsvValues = availableGuidanceData["py_gross_sales_value"] || [];

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
          id: guidanceOption.value,
          label: combinedLabel,
          data,
          color: guidanceOption.color,
        };
      }
    });
  }, [graphData, guidanceForecasts, availableGuidanceData]);

  // Get selected guidance data
  const selectedGuidance = useMemo(() => {
    return guidanceForecasts.filter((guidance) =>
      selectedTrendLines.includes(guidance.value)
    );
  }, [guidanceForecasts, selectedTrendLines]);

  const handleTrendLineAdd = (trendLineId: string) => {
    dispatch(setSelectedTrendLines([...selectedTrendLines, trendLineId]));
  };

  const handleTrendLineRemove = (trendLineId: string) => {
    const newSelectedTrendLines = selectedTrendLines.filter(
      (id: string) => id !== trendLineId
    );
    dispatch(setSelectedTrendLines(newSelectedTrendLines));
  };

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    dispatch(updateMonthValue({ month, value: numValue }));
    onMonthValueChange(month, value);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: width,
          boxShadow: 3,
          backgroundColor: "background.paper",
        },
      }}
    >
      {/* Header Box (Title + Close Button) - Stays at top */}
      <Box
        sx={{
          p: 3,
          pb: 1, // Reduce bottom padding
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid", // Add separator
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">{title}</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Top Info Section (Non-scrolling - ONLY Guidance Summary now) */}
      <Box
        sx={{
          px: 3,
          pt: 2,
          pb: 2,
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Guidance Summary Grid */}
        {yearlyGuidance && pyTotalVolume !== undefined && (
          <Grid
            item
            xs={12}
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="overline"
              display="block"
              gutterBottom
              sx={{ mb: 1.5, color: "primary.main", fontWeight: "bold" }}
            >
              GUIDANCE SUMMARY
            </Typography>
            <Grid container spacing={1}>
              {/* TY Forecast */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    TY Forecast
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(total)}
                  </Typography>
                </Box>
              </Grid>
              {/* LY Actual */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    LY Actual
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(pyTotalVolume)}
                  </Typography>
                </Box>
              </Grid>
              {/* Delta */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    TY vs LY
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(yearlyGuidance.delta)}
                  </Typography>
                </Box>
              </Grid>
              {/* % Change */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    TY vs LY %
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(
                      yearlyGuidance.percentChange,
                      "percent"
                    )}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        )}

        {/* Shipment Guidance Summary Grid */}
        {shipmentGuidanceSummary && (
          <Grid
            item
            xs={12}
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              mt: yearlyGuidance && pyTotalVolume !== undefined ? 2 : 0,
            }}
          >
            <Typography
              variant="overline"
              display="block"
              gutterBottom
              sx={{ mb: 1.5, color: "primary.main", fontWeight: "bold" }}
            >
              GUIDANCE SUMMARY
            </Typography>
            <Grid container spacing={1}>
              {/* TY Forecast */}
              <Grid item xs={6} sm={2.4}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    TY Forecast
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(shipmentGuidanceSummary.tyForecast)}
                  </Typography>
                </Box>
              </Grid>
              {/* LY Actual */}
              <Grid item xs={6} sm={2.4}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    LY Actual
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(shipmentGuidanceSummary.lyActual)}
                  </Typography>
                </Box>
              </Grid>
              {/* Inventory */}
              <Grid item xs={6} sm={2.4}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Inv.
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {formatGuidanceValue(shipmentGuidanceSummary.inventory)}
                  </Typography>
                </Box>
              </Grid>
              {/* Current DDOI */}
              <Grid item xs={6} sm={2.4}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Current DDOI
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {shipmentGuidanceSummary.currentDDOI}
                  </Typography>
                </Box>
              </Grid>
              {/* Lead Times */}
              <Grid item xs={6} sm={2.4}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Lead time
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {shipmentGuidanceSummary.leadTimes}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Scrollable Content Section (Market/Item/Logic + Graph etc.) */}
      <Box sx={{ p: 3, pt: 2, flex: 1, overflow: "auto" }}>
        {/* MOVED Market/Item/Logic Here */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Market/Customer/Item Grids */}
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
          {/* Logic Grid */}
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
        </Grid>

        {/* Graph, Monthly, Commentary */}
        <Grid container spacing={3}>
          {/* Graph Grid */}
          <Grid item xs={12}>
            <InteractiveGraph
              months={months}
              total={total}
              holdTotal={false}
              mode="forecast"
              onDistributionChange={(distribution) => {
                Object.entries(distribution).forEach(([month, value]) => {
                  handleMonthValueChange(month, value.toString());
                });
              }}
              onTotalChange={(_newTotal) => {
                // No-op: do not redistribute values when hold total is off
              }}
              onMonthValueChange={(month, value) => {
                handleMonthValueChange(month, value.toString());
              }}
              guidanceLines={trendLines}
              selectedGuidanceIds={selectedTrendLines}
              onGuidanceSelect={handleTrendLineAdd}
              onGuidanceDeselect={handleTrendLineRemove}
              label="FORECAST TREND"
              yAxisFormat="number"
            />
          </Grid>

          {/* MonthlyValues Grid */}
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
                      Math.abs(
                        (months[month]?.value || 0) -
                          (originalMonths[month]?.value || 0)
                      ) > 0.0001,
                  })),
                })
              )}
              onMonthValueChange={handleMonthValueChange}
              label="MONTHLY VALUES"
              defaultExpanded={true}
              gsvRate={gsvRate}
              guidanceForecasts={selectedGuidance}
              availableGuidanceData={availableGuidanceData}
            />
          </Grid>

          {/* Commentary Grid */}
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
        </Grid>
      </Box>

      {/* Footer Buttons - Stays at bottom */}
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
