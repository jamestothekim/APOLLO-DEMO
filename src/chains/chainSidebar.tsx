import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Drawer,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Grid,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { RootState } from "../redux/store";
import {
  updateChainMonthlyValue,
  updateMonthValueOptimistic,
  updateChainForecastLogic,
  updateForecastLogicOptimistic,
  ChainForecastData,
} from "../redux/slices/chainSlice";
import {
  FORECAST_OPTIONS,
  type ForecastLogic,
} from "../volume/util/volumeUtil";
import { InteractiveGraph } from "../reusableComponents/interactiveGraph";
import { MonthlyValues } from "../reusableComponents/monthlyValues";
import {
  setMonths,
  updateMonthValue,
  setSelectedTrendLines,
} from "../redux/slices/sidebarSlice";
import type {
  MonthData,
  TrendLine,
} from "../reusableComponents/interactiveGraph";

interface ChainSidebarProps {
  open: boolean;
  onClose: () => void;
  chainId: string | null;
}

// Month names for editing
const MONTH_NAMES = [
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

// Fixed quarter groups for the sidebar (matching QuantSidebar)
const QUARTER_GROUPS = [
  { label: "Q1", months: ["JAN", "FEB", "MAR"] },
  { label: "Q2", months: ["APR", "MAY", "JUN"] },
  { label: "Q3", months: ["JUL", "AUG", "SEP"] },
  { label: "Q4", months: ["OCT", "NOV", "DEC"] },
];

export const ChainSidebar: React.FC<ChainSidebarProps> = ({
  open,
  onClose,
  chainId,
}) => {
  const dispatch = useDispatch();
  // Get chain data from Redux
  const chainData = useSelector((state: RootState) =>
    state.chain.data.find((item: ChainForecastData) => item.id === chainId)
  );

  // Redux sidebar state
  const { months, total, selectedTrendLines } = useSelector(
    (state: RootState) => state.sidebar
  );

  // Local state
  const [comments, setComments] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

  // Store the original months as a stable ref for edit icon comparison
  const originalMonthsRef = useRef<{ [key: string]: MonthData } | null>(null);

  // Calculate which months are actual vs projected/forecast (similar to chain planner)
  const lastActualMonthIndex = useMemo(() => {
    if (!chainData) return -1;

    let maxActualIndex = -1;
    MONTH_NAMES.forEach((month, index) => {
      if (chainData.months[month]?.isActual) {
        maxActualIndex = Math.max(maxActualIndex, index);
      }
    });
    return maxActualIndex;
  }, [chainData]);

  useEffect(() => {
    if (open && chainData) {
      // Only set on open, and only if not already set
      if (!originalMonthsRef.current) {
        const initialMonths: { [key: string]: MonthData } = {};
        MONTH_NAMES.forEach((month, index) => {
          initialMonths[month] = {
            value: chainData.months[month]?.value || 0,
            isActual: index <= lastActualMonthIndex, // Set actual based on lastActualMonthIndex
          };
        });
        originalMonthsRef.current = JSON.parse(JSON.stringify(initialMonths));
        dispatch(setMonths(initialMonths));
      }
      setComments(chainData.comments || "");
      setHasChanges(false);
    } else {
      // Reset when sidebar closes
      originalMonthsRef.current = null;
    }
  }, [open, chainData, dispatch, lastActualMonthIndex]);

  const originalMonths = originalMonthsRef.current || {};

  // Calculate derived yearly guidance metrics
  const yearlyGuidance = useMemo(() => {
    if (!chainData) return null;
    const currentTotal = total;
    const previousTotal = chainData.tyVol || 0;
    const delta = currentTotal - previousTotal;
    const percentChange = previousTotal > 0 ? delta / previousTotal : 0;
    return {
      delta,
      percentChange,
    };
  }, [total, chainData]);

  // Handle trend line management
  const handleTrendLineAdd = (trendLineId: string) => {
    const newSelectedTrendLines = [...selectedTrendLines, trendLineId];
    dispatch(setSelectedTrendLines(newSelectedTrendLines));
  };

  const handleTrendLineRemove = (trendLineId: string) => {
    const newSelectedTrendLines = selectedTrendLines.filter(
      (id: string) => id !== trendLineId
    );
    dispatch(setSelectedTrendLines(newSelectedTrendLines));
  };

  // Handle month value change (only update local state, not Redux until save)
  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    // Prevent editing of actual months
    const monthIndex = MONTH_NAMES.indexOf(month);
    if (monthIndex <= lastActualMonthIndex) {
      console.warn(`Cannot edit actual month: ${month}`);
      return;
    }

    // Only update local sidebar state, not Redux
    dispatch(updateMonthValue({ month, value: numValue }));
    setHasChanges(true);
  };

  // Handle forecast logic change
  const handleForecastLogicChange = (newLogic: ForecastLogic) => {
    if (!chainData) return;

    // Optimistic update
    dispatch(
      updateForecastLogicOptimistic({
        id: chainData.id,
        forecastLogic: newLogic,
      })
    );

    // API call
    dispatch(
      updateChainForecastLogic({
        id: chainData.id,
        forecastLogic: newLogic,
      }) as any
    );
  };

  // Handle save changes
  const handleSave = () => {
    if (!chainData) return;

    // Save each month that has changed
    MONTH_NAMES.forEach((month) => {
      const currentValue = chainData.months[month]?.value || 0;
      const newValue = months[month]?.value || 0;

      if (Math.abs(currentValue - newValue) > 0.0001) {
        // Apply optimistic update to Redux
        dispatch(
          updateMonthValueOptimistic({
            id: chainData.id,
            month,
            value: newValue,
          })
        );

        // API call for backend persistence
        dispatch(
          updateChainMonthlyValue({
            id: chainData.id,
            month,
            value: newValue,
          }) as any
        );
      }
    });

    // TODO: Save comments when API is available
    console.log("Comments to save:", comments);

    setHasChanges(false);
    setShowSuccessSnackbar(true);
    // Close the sidebar after a short delay to allow the snackbar to show
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasChanges) {
      const confirm = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirm) return;
    }
    onClose();
  };

  // Prepare trend lines (placeholder for now)
  const trendLines: TrendLine[] = []; // TODO: Add trend lines when available

  // Footer buttons
  const footerButtons = [
    {
      label: "Save Changes",
      onClick: handleSave,
      variant: "contained" as const,
      disabled: !hasChanges,
    },
    {
      label: hasChanges ? "Cancel" : "Close",
      onClick: handleClose,
      variant: "outlined" as const,
      disabled: false,
    },
  ];

  if (!chainData) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: "600px",
            boxShadow: 3,
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            pb: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6">Chain Forecast Details</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Alert severity="warning" sx={{ m: 2 }}>
          No chain data selected. Please select a chain from the table.
        </Alert>
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: "600px",
          boxShadow: 3,
          backgroundColor: "background.paper",
        },
      }}
    >
      {/* Header Box (Title + Close Button) - Stays at top */}
      <Box
        sx={{
          p: 3,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">Chain Forecast Details</Typography>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Top Info Section (Non-scrolling - Guidance Summary) */}
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
        {yearlyGuidance && (
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
              CHAIN FORECAST SUMMARY
            </Typography>
            <Grid container spacing={1}>
              {/* TY Forecast */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    TY Forecast
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {total.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </Typography>
                </Box>
              </Grid>
              {/* Previous Total */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Original
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {(chainData.tyVol || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </Typography>
                </Box>
              </Grid>
              {/* Delta */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Delta
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color:
                        yearlyGuidance.delta >= 0
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    {yearlyGuidance.delta >= 0 ? "+" : ""}
                    {yearlyGuidance.delta.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </Typography>
                </Box>
              </Grid>
              {/* Percentage */}
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="caption" display="block">
                    Change %
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      color:
                        yearlyGuidance.percentChange >= 0
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    {yearlyGuidance.percentChange >= 0 ? "+" : ""}
                    {(yearlyGuidance.percentChange * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Scrollable Content Area */}
      <Box sx={{ p: 3, pt: 2, flex: 1, overflow: "auto" }}>
        {/* Chain/Market/Item/Logic Info */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Market */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Market:</Typography>
              <Typography>{chainData.market}</Typography>
            </Box>
          </Grid>
          {/* Chain */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Chain:</Typography>
              <Typography>{chainData.chain}</Typography>
              <Chip
                label={chainData.status?.toUpperCase() || "DRAFT"}
                color={chainData.status === "approved" ? "success" : "default"}
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>
          </Grid>
          {/* Product */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Product:</Typography>
              <Typography>{chainData.product}</Typography>
            </Box>
          </Grid>
          {/* Logic */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Logic:</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={chainData.forecastLogic}
                  onChange={(e) =>
                    handleForecastLogicChange(e.target.value as ForecastLogic)
                  }
                >
                  {FORECAST_OPTIONS.map((option) => (
                    <MenuItem key={option.id} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>

        {/* Graph, Monthly, Commentary */}
        <Grid container spacing={3}>
          {/* Interactive Graph */}
          <Grid item xs={12}>
            <InteractiveGraph
              months={months}
              total={total}
              holdTotal={false}
              mode="forecast"
              onDistributionChange={(distribution) => {
                Object.entries(distribution).forEach(([month, value]) => {
                  // Only allow changes to non-actual months
                  const monthIndex = MONTH_NAMES.indexOf(month);
                  if (monthIndex > lastActualMonthIndex) {
                    handleMonthValueChange(month, value.toString());
                  }
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
              label="CHAIN FORECAST TREND"
              yAxisFormat="number"
            />
          </Grid>

          {/* Monthly Values */}
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
            />
          </Grid>

          {/* Commentary */}
          <Grid item xs={12}>
            <TextField
              label="Commentary"
              multiline
              rows={3}
              fullWidth
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Add your comments about this chain forecast..."
            />
          </Grid>
        </Grid>
      </Box>

      {/* Footer Buttons - Stays at bottom */}
      <Box
        sx={{
          p: 3,
          pt: 2,
          borderTop: "1px solid",
          borderColor: "divider",
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
          >
            {button.label}
          </Button>
        ))}
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSuccessSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSuccessSnackbar(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Chain forecast changes saved successfully!
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default ChainSidebar;
