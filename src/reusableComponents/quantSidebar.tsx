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
import { useTheme } from "@mui/material/styles";
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
  months,
  onMonthValueChange,
  commentary,
  onCommentaryChange,
  footerButtons = [],
}: QuantSidebarProps) => {
  const theme = useTheme();
  const [selectedTrendLines, setSelectedTrendLines] = useState<string[]>([]);

  // Generate trend lines based on the current data
  const trendLines = useMemo(() => {
    if (!graphData.length) return [];

    const baseData = graphData[0].data;

    // Create LAP data
    const lapData = baseData.map(({ month, value }) => ({
      month,
      value: Math.round(value * (0.8 + Math.random() * 0.4)), // Random value between -20% and +20%
    }));

    // Create budget data
    const budgetData = baseData.map(({ month, value }) => ({
      month,
      value: Math.round(value * 1.05), // 5% above forecast
    }));

    return [
      {
        id: "lap",
        label: "LAP",
        data: lapData,
        color: theme.palette.info.main,
      },
      {
        id: "budget-2025",
        label: "2025 Budget",
        data: budgetData,
        color: theme.palette.secondary.main,
      },
    ];
  }, [graphData, theme.palette.info.main, theme.palette.secondary.main]);

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
            backgroundColor: (theme) => theme.palette.background.paper,
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
