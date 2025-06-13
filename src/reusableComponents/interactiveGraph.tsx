import React, { useRef, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Collapse,
  Button,
  TextField,
  Tooltip,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import dragDataPlugin from "chartjs-plugin-dragdata";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckIcon from "@mui/icons-material/Check";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useTheme } from "@mui/material/styles";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ChartTooltip,
  Legend,
  dragDataPlugin
);

// --- Types ---
export interface MonthData {
  value: number;
  isActual: boolean;
}

export interface TrendLine {
  id: string;
  label: string;
  data: { month: string; value: number }[];
  color: string;
}

export type Mode = "budget" | "forecast";

export interface SuperGraphProps {
  months: { [month: string]: MonthData };
  total: number;
  holdTotal: boolean;
  mode: Mode;
  onDistributionChange: (distribution: { [month: string]: number }) => void;
  onTotalChange: (total: number) => void;
  onMonthValueChange?: (month: string, value: number) => void;
  guidanceLines?: TrendLine[];
  selectedGuidanceIds?: string[];
  onGuidanceSelect?: (id: string) => void;
  onGuidanceDeselect?: (id: string) => void;
  label?: string;
  height?: number;
  width?: number;
  yAxisFormat?: "currency" | "number";
}

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

// Helper to format total for display
const formatTotal = (val: number) =>
  Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export const InteractiveGraph = ({
  months,
  total,
  holdTotal = false,
  mode: _mode,
  onDistributionChange,
  onTotalChange,
  onMonthValueChange,
  guidanceLines = [],
  selectedGuidanceIds = [],
  onGuidanceSelect,
  onGuidanceDeselect,
  label = "Forecast Trend",
  width,
  yAxisFormat = "currency",
}: SuperGraphProps) => {
  const chartRef = useRef<any>(null);
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null
  );
  const [localHoldTotal, setLocalHoldTotal] = React.useState(holdTotal);
  const [localTotal, setLocalTotal] = React.useState(total);
  const [selectedGuidance, setSelectedGuidance] =
    React.useState<string[]>(selectedGuidanceIds);
  const [totalInputValue, setTotalInputValue] = React.useState<string>(
    formatTotal(total)
  );

  // --- Sync local state with props ---
  useEffect(() => {
    setLocalHoldTotal(holdTotal);
  }, [holdTotal]);
  useEffect(() => {
    setLocalTotal(total);
    setTotalInputValue(formatTotal(total));
  }, [total]);
  useEffect(() => {
    setSelectedGuidance(selectedGuidanceIds);
  }, [selectedGuidanceIds]);

  // --- Prepare data for chart ---
  const distribution = useMemo(
    () => MONTHS.map((m) => months[m]?.value ?? 0),
    [months]
  );
  const actualMask = useMemo(
    () => MONTHS.map((m) => months[m]?.isActual ?? false),
    [months]
  );

  // --- Chart.js Data ---
  const mainLineColor = theme.palette.primary.main;
  const mainLine = {
    label: "VOL 9L (TY FCST)",
    data: distribution,
    borderColor: mainLineColor,
    backgroundColor: mainLineColor + "33",
    pointBackgroundColor: (ctx: any) =>
      actualMask[ctx.dataIndex] ? "#aaa" : mainLineColor,
    pointBorderColor: (ctx: any) =>
      actualMask[ctx.dataIndex] ? "#aaa" : mainLineColor,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false,
    tension: 0.4,
    borderWidth: 2,
    dragData: true,
    dragDataRound: 1,
    dragDataBackgroundColor: (ctx: any) =>
      actualMask[ctx.dataIndex] ? "#aaa" : mainLineColor,
  };
  const guidanceDatasets = (guidanceLines || [])
    .filter((g) => selectedGuidance.includes(g.id))
    .map((g) => ({
      label: g.label,
      data: MONTHS.map((m) => g.data.find((d) => d.month === m)?.value ?? 0),
      borderColor: g.color,
      backgroundColor: g.color + "33",
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0.4,
      borderWidth: 2,
      dragData: false,
    }));
  const data = {
    labels: MONTHS,
    datasets: [mainLine, ...guidanceDatasets],
  };

  // --- Drag Logic ---
  const handleDragEnd = (
    _e: any,
    _datasetIndex: number,
    index: number,
    value: number
  ) => {
    if (actualMask[index]) return; // Guard against dragging actual months
    let newDist = [...distribution];

    if (localHoldTotal) {
      // Calculate the sum of actual months
      const actualSum = MONTHS.reduce(
        (sum, _m, i) => sum + (actualMask[i] ? newDist[i] : 0),
        0
      );
      const editableIndices = MONTHS.map((_, i) =>
        !actualMask[i] ? i : -1
      ).filter((i) => i !== -1);

      // Clamp the value to the maximum possible for this month
      const maxForMonth = localTotal - actualSum;
      const clampedValue = Math.min(value, maxForMonth);
      newDist[index] = clampedValue;

      // Calculate the sum of the other editable months (excluding the dragged one)
      const otherEditableIndices = editableIndices.filter((i) => i !== index);
      const oldOtherSum = otherEditableIndices.reduce(
        (sum, i) => sum + distribution[i],
        0
      );
      const targetOtherSum = localTotal - actualSum - clampedValue;

      // Distribute the targetOtherSum proportionally to the other editable months
      for (let i of otherEditableIndices) {
        newDist[i] =
          oldOtherSum === 0
            ? targetOtherSum / otherEditableIndices.length
            : (distribution[i] / oldOtherSum) * targetOtherSum;
      }

      // Round all editable values to one decimal
      newDist = newDist.map((v, i) =>
        actualMask[i] ? v : Math.round(v * 10) / 10
      );

      // Adjust for rounding error so the sum matches exactly
      const sumOther = otherEditableIndices.reduce(
        (sum, i) => sum + newDist[i],
        0
      );
      const roundingError = targetOtherSum - sumOther;
      if (otherEditableIndices.length > 0) {
        newDist[otherEditableIndices[0]] += roundingError;
      }

      // Emit as object
      const distObj: { [key: string]: number } = {};
      MONTHS.forEach((m, i) => (distObj[m] = newDist[i]));
      onDistributionChange(distObj);
    } else {
      // If hold total is off, only update the dragged month
      newDist[index] = value;
      const newTotal = newDist.reduce((sum, v) => sum + v, 0);
      setLocalTotal(newTotal);
      onTotalChange(newTotal);
      if (typeof onMonthValueChange === "function") {
        onMonthValueChange(MONTHS[index], value);
      }
    }
  };

  // --- Chart.js Options ---
  // Center the line: min just below min value, max just above max value, with padding
  const minMonthlyValue = Math.min(...distribution);
  const maxMonthlyValue = Math.max(...distribution);
  const yPadding = (maxMonthlyValue - minMonthlyValue) * 0.75 || 10;
  const yMin = Math.max(0, Math.floor(minMonthlyValue - yPadding));
  const yMax = Math.ceil(maxMonthlyValue + yPadding);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: true,
        callbacks: {
          label: (ctx: any) => {
            let label = ctx.dataset.label || "";
            if (ctx.datasetIndex === 0) {
              const pointColor = ctx.dataset.pointBackgroundColor
                ? typeof ctx.dataset.pointBackgroundColor === "function"
                  ? ctx.dataset.pointBackgroundColor(ctx)
                  : ctx.dataset.pointBackgroundColor
                : undefined;
              if (pointColor === "#aaa") {
                label = "VOL 9L (TY ACT)";
              } else {
                label = "VOL 9L (TY FCST)";
              }
            }
            let value = ctx.parsed.y;
            let formatted =
              yAxisFormat === "currency"
                ? `$${value.toLocaleString()}`
                : value.toLocaleString();
            return `${label}: ${formatted}`;
          },
        },
      },
      dragData: {
        round: 1,
        showTooltip: true,
        onDragStart: (_e: any, _datasetIndex: number, index: number) => {
          if (actualMask[index]) {
            return false; // cancel drag
          }
          return true;
        },
        onDrag: () => {},
        onDragEnd: handleDragEnd,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: yMin,
        max: yMax,
        grid: { display: false },
        ticks: {
          color: "#333",
          callback: (value: number) =>
            yAxisFormat === "currency"
              ? `$${value.toLocaleString()}`
              : value.toLocaleString(),
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#333" },
      },
    },
  };

  // --- UI Handlers ---
  const handleTotalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas for parsing
    const raw = e.target.value.replace(/,/g, "");
    setTotalInputValue(e.target.value);
    const num = Number(raw);
    if (!isNaN(num)) {
      setLocalTotal(num);
    }
  };
  const handleTotalInputBlur = () => {
    const val = Number(totalInputValue.replace(/,/g, ""));
    if (!isNaN(val)) {
      // 1. Calculate sum of actuals
      const actualMonths = MONTHS.filter((m) => months[m]?.isActual);
      const editableMonths = MONTHS.filter((m) => !months[m]?.isActual);
      const sumOfActuals = actualMonths.reduce(
        (sum, m) => sum + (months[m]?.value ?? 0),
        0
      );
      const sumOfEditable = editableMonths.reduce(
        (sum, m) => sum + (months[m]?.value ?? 0),
        0
      );
      const targetEditableTotal = val - sumOfActuals;
      // 2. Proportionally scale editable months, but round down to 1 decimal
      let newDistribution: { [month: string]: number } = {};
      let flooredSum = 0;
      let maxMonth = editableMonths[0];
      let maxOriginal = months[maxMonth]?.value ?? 0;
      // First pass: assign floored values and track max
      editableMonths.forEach((m) => {
        let prop =
          sumOfEditable === 0
            ? targetEditableTotal / editableMonths.length
            : (months[m].value / sumOfEditable) * targetEditableTotal;
        if ((months[m].value ?? 0) > maxOriginal) {
          maxMonth = m;
          maxOriginal = months[m].value ?? 0;
        }
        let floored = Math.floor(prop * 10) / 10;
        newDistribution[m] = floored;
        flooredSum += floored;
      });
      // 3. Assign the remainder to the max month
      const remainder =
        Math.round((targetEditableTotal - flooredSum) * 10) / 10;
      if (editableMonths.length > 0 && Math.abs(remainder) > 0.0001) {
        newDistribution[maxMonth] =
          Math.round((newDistribution[maxMonth] + remainder) * 10) / 10;
      }
      onDistributionChange(newDistribution);
      setLocalTotal(val);
      setTotalInputValue(formatTotal(val));
      onTotalChange(val);
    } else {
      setTotalInputValue(formatTotal(localTotal));
    }
  };
  const handleTotalInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleTotalInputBlur();
    }
  };
  const handleGuidanceMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(e.currentTarget);
  };
  const handleGuidanceMenuClose = () => {
    setMenuAnchorEl(null);
  };
  const handleGuidanceToggle = (id: string) => {
    let newSelected: string[];
    if (selectedGuidance.includes(id)) {
      newSelected = selectedGuidance.filter((g) => g !== id);
      setSelectedGuidance(newSelected);
      onGuidanceDeselect && onGuidanceDeselect(id);
    } else {
      newSelected = [...selectedGuidance, id];
      setSelectedGuidance(newSelected);
      onGuidanceSelect && onGuidanceSelect(id);
    }
  };

  // --- Render ---
  return (
    <Box sx={{ width: width || "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          mb: 2,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <RemoveIcon /> : <AddIcon />}
        </IconButton>
        <Typography variant="h6" sx={{ userSelect: "none" }}>
          {label}
        </Typography>
        <Box sx={{ flex: 1 }} />
      </Box>
      <Collapse in={isExpanded}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            gap: 2,
          }}
        >
          {/* Left group: Total + Hold Total */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label="Total"
              type="text"
              value={totalInputValue}
              onChange={handleTotalInputChange}
              onBlur={handleTotalInputBlur}
              onKeyDown={handleTotalInputKeyDown}
              size="small"
              sx={{
                width: 120,
                mr: 1,
                background: "background.paper",
                borderRadius: 1,
                boxShadow: 0,
              }}
              inputProps={{ min: 0 }}
            />
            <Tooltip
              title="Hold Total keeps the annual volume locked while you drag forecast points. Any change is re-allocated proportionally across the remaining forecast months. Edits made directly in Monthly Values will still change the total."
              arrow
            >
              <Button
                variant={localHoldTotal ? "contained" : "outlined"}
                color={localHoldTotal ? "primary" : "primary"}
                startIcon={
                  localHoldTotal ? (
                    <LockIcon fontSize="small" />
                  ) : (
                    <LockOpenIcon fontSize="small" />
                  )
                }
                onClick={() => setLocalHoldTotal((prev) => !prev)}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  bgcolor: localHoldTotal ? "primary.main" : "background.paper",
                  color: localHoldTotal ? "#fff" : "primary.main",
                  borderColor: "primary.main",
                  boxShadow: 0,
                  minWidth: 110,
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                  "&:hover": {
                    bgcolor: localHoldTotal ? "primary.dark" : "primary.100",
                  },
                }}
              >
                Hold Total
              </Button>
            </Tooltip>
          </Box>
          {/* Right: Guidance */}
          {guidanceLines.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewColumnIcon />}
              onClick={handleGuidanceMenuOpen}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                minWidth: 110,
                px: 2,
                py: 1,
                boxShadow: 0,
              }}
            >
              Guidance
            </Button>
          )}
        </Box>
        <Box sx={{ position: "relative" }}>
          <Line ref={chartRef} data={data} options={options as any} />
        </Box>
        {/* Custom Legend Below the Graph */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            mt: 2,
          }}
        >
          {/* Main Forecast Line */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 0,
                borderTop: "3px solid",
                borderColor: mainLineColor,
                borderRadius: 2,
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: mainLineColor, fontWeight: 500 }}
            >
              Current Forecast
            </Typography>
          </Box>
          {/* Guidance Lines */}
          {guidanceLines &&
            guidanceLines
              .filter((g) => selectedGuidance.includes(g.id))
              .map((g) => (
                <Box
                  key={g.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 0,
                      borderTop: "3px dashed",
                      borderColor: g.color,
                      borderRadius: 2,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: g.color, fontWeight: 500 }}
                  >
                    {g.label}
                  </Typography>
                </Box>
              ))}
        </Box>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleGuidanceMenuClose}
        >
          {guidanceLines.map((trendLine) => {
            const isSelected = selectedGuidance.includes(trendLine.id);
            const displayLabel = trendLine.label;
            return (
              <MenuItem
                key={trendLine.id}
                onClick={() => handleGuidanceToggle(trendLine.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: trendLine.color,
                      borderRadius: "2px",
                    }}
                  />
                  {displayLabel}
                </Box>

                <Box
                  sx={{ width: 24, display: "flex", justifyContent: "center" }}
                >
                  {isSelected && <CheckIcon fontSize="small" />}
                </Box>
              </MenuItem>
            );
          })}
        </Menu>
      </Collapse>
    </Box>
  );
};
