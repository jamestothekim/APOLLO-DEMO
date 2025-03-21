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
import { useState, useEffect, useMemo, useCallback } from "react";
import { type ExtendedForecastData } from "../volume/depletions/depletions";
import { InteractiveGraph } from "./interactiveGraph";
import { useTheme } from "@mui/material/styles";
import { MonthlyValues } from "./monthlyValues";

interface MonthData {
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface QuantSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: ExtendedForecastData;
  onSave: (data: ExtendedForecastData) => void;
  onForecastLogicChange: (newLogic: string) => Promise<void>;
  forecastOptions: Array<{ id: number; label: string; value: string }>;
}

export const QuantSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
  onForecastLogicChange,
  forecastOptions,
}: QuantSidebarProps) => {
  const [editedData, setEditedData] = useState<ExtendedForecastData | null>(
    null
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTrendLines, setSelectedTrendLines] = useState<string[]>([]);

  const theme = useTheme();

  const trendLines = useMemo(() => {
    if (!editedData) return [];

    // Create LAP data
    const lapData = Object.entries(editedData.months).map(([month, data]) => {
      const baseValue = data.value;
      // Random value between -20% and +20% of the forecast
      const randomFactor = 0.8 + Math.random() * 0.4; // generates number between 0.8 and 1.2
      return {
        month,
        value: Math.round(baseValue * randomFactor),
      };
    });

    // Replace budget data logic with simplified version
    const monthlyBudgetData = Object.entries(editedData.months).map(
      ([month, data]) => ({
        month,
        value: Math.round(data.value * 1.05),
      })
    );

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
        data: monthlyBudgetData,
        color: theme.palette.secondary.main,
      },
    ];
  }, [editedData, theme.palette.secondary.main, theme.palette.info.main]);

  const graphData = useMemo(() => {
    if (!editedData) return [];

    const baseData = [
      {
        id: "forecast",
        label: `${editedData.market_name} - ${editedData.product}`,
        data: Object.entries(editedData.months).map(([month, data]) => ({
          month,
          value: data.value,
        })),
        color: theme.palette.primary.main,
      },
    ];

    const selectedTrendLineData = trendLines
      .filter((tl) => selectedTrendLines.includes(tl.id))
      .map((tl) => ({
        id: tl.id,
        label: tl.label,
        data: tl.data,
        color: tl.color,
      }));

    return [...baseData, ...selectedTrendLineData];
  }, [editedData, trendLines, selectedTrendLines, theme.palette.primary.main]);

  useEffect(() => {
    setEditedData(selectedData || null);
    setHasChanges(false);
  }, [selectedData]);

  const handleTrendLineAdd = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => [...prev, trendLineId]);
  }, []);

  const handleTrendLineRemove = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => prev.filter((id) => id !== trendLineId));
  }, []);

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setEditedData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: {
            ...prev.months[month],
            value: Math.round(numValue * 10) / 10,
            isManuallyModified: true,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months).reduce(
      (acc, curr: MonthData) => acc + curr.value,
      0
    );
  };

  const handleSave = async () => {
    if (editedData) {
      try {
        onSave(editedData);
        setHasChanges(false);
      } catch (error) {
        console.error("Error saving changes:", error);
      }
    }
  };

  // Helper function to group months by quarter
  const quarterGroups = [
    { label: "Q1", months: ["JAN", "FEB", "MAR"] },
    { label: "Q2", months: ["APR", "MAY", "JUN"] },
    { label: "Q3", months: ["JUL", "AUG", "SEP"] },
    { label: "Q4", months: ["OCT", "NOV", "DEC"] },
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: "600px",
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
          <Typography variant="h6">Forecast Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Market:</Typography>
              <Typography>{editedData?.market_name}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Item:</Typography>
              <Typography>{editedData?.product}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Logic:</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editedData?.forecastLogic || ""}
                  onChange={(e) => {
                    onForecastLogicChange(e.target.value);
                    setHasChanges(true);
                  }}
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

          <Grid item xs={12}>
            <InteractiveGraph
              datasets={graphData}
              availableTrendLines={trendLines}
              onTrendLineAdd={handleTrendLineAdd}
              onTrendLineRemove={handleTrendLineRemove}
              primaryLabel="Primary Forecast"
              label="FORECAST TREND"
            />
          </Grid>

          <Grid item xs={12}>
            <MonthlyValues
              quarterGroups={quarterGroups.map(({ label, months }) => ({
                label,
                months: months.map((month) => ({
                  month,
                  value: editedData?.months[month]?.value || 0,
                  isActual: editedData?.months[month]?.isActual || false,
                  isManuallyModified:
                    editedData?.months[month]?.isManuallyModified || false,
                })),
              }))}
              onMonthValueChange={handleMonthValueChange}
              label="MONTHLY VALUES"
              defaultExpanded={true}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Commentary"
              multiline
              rows={3}
              fullWidth
              value={editedData?.commentary || ""}
              onChange={(e) => {
                setEditedData((prev) =>
                  prev ? { ...prev, commentary: e.target.value } : prev
                );
                setHasChanges(true);
              }}
              placeholder="Add your comments here..."
            />
          </Grid>

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
        <Button variant="outlined" onClick={onClose} sx={{ minWidth: "120px" }}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges}
          sx={{ minWidth: "120px" }}
        >
          Save Changes
        </Button>
      </Box>
    </Drawer>
  );
};
