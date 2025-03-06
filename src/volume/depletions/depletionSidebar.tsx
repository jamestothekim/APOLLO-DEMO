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
  SelectChangeEvent,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  type ForecastData,
  type ForecastLogic,
  useForecast,
} from "../../data/data";
import { InteractiveGraph } from "../../reusableComponents/interactiveGraph";
import { useTheme } from "@mui/material/styles";
import { MonthlyValues } from "../../reusableComponents/monthlyValues";

interface MonthData {
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface ForecastSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: ForecastData;
  onSave: (data: ForecastData) => void;
  forecastLogicOptions: readonly string[];
}

export const ForecastSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
  forecastLogicOptions,
}: ForecastSidebarProps) => {
  const [editedData, setEditedData] = useState<ForecastData | undefined>(
    undefined
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTrendLines, setSelectedTrendLines] = useState<string[]>([]);

  const theme = useTheme();
  const { budgetData, getGrowthRate } = useForecast();

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

    const budgetRow = budgetData.find(
      (budget) => budget.id === `budget-${editedData.id}`
    );

    const trendLines = [
      {
        id: "lap",
        label: "LAP",
        data: lapData,
        color: theme.palette.info.main,
      },
    ];

    if (!budgetRow) {
      const monthlyBudgetData = Object.entries(editedData.months).map(
        ([month, data]) => ({
          month,
          value: Math.round(data.value * 1.05),
        })
      );

      trendLines.push({
        id: "budget-2025",
        label: "2025 Budget",
        data: monthlyBudgetData,
        color: theme.palette.secondary.main,
      });
    } else {
      trendLines.push({
        id: "budget-2025",
        label: "2025 Budget",
        data: Object.entries(budgetRow.months).map(([month, data]) => ({
          month,
          value: data.value,
        })),
        color: theme.palette.secondary.main,
      });
    }

    return trendLines;
  }, [
    editedData,
    budgetData,
    theme.palette.secondary.main,
    theme.palette.info.main,
  ]);

  const graphData = useMemo(() => {
    if (!editedData) return [];

    const baseData = [
      {
        id: "forecast",
        label: `${editedData.market} - ${editedData.item}`,
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
    setEditedData(selectedData);
    setHasChanges(false);
  }, [selectedData]);

  const handleTrendLineAdd = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => [...prev, trendLineId]);
  }, []);

  const handleTrendLineRemove = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => prev.filter((id) => id !== trendLineId));
  }, []);

  if (!editedData) return null;

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setEditedData((prev: ForecastData | undefined) => {
      if (!prev) return prev;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: {
            ...prev.months[month],
            value: numValue,
            isManuallyModified: true,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleLogicChange = (event: SelectChangeEvent<string>) => {
    const newLogic = event.target.value as ForecastLogic;

    setEditedData((prev: ForecastData | undefined) => {
      if (!prev) return prev;

      if (newLogic === "Flat") {
        const lastActualMonth = Object.entries(prev.months).find(
          ([_, data]) => data.isActual
        );
        const flatValue = lastActualMonth ? lastActualMonth[1].value : 0;

        const flatMonths = Object.entries(prev.months).reduce(
          (acc, [month, data]) => ({
            ...acc,
            [month]: data.isActual
              ? data
              : {
                  value: flatValue,
                  isActual: false,
                  isManuallyModified: false,
                },
          }),
          {}
        );

        return {
          ...prev,
          forecastLogic: newLogic,
          months: flatMonths,
        };
      }

      if (newLogic === "Custom") {
        return {
          ...prev,
          forecastLogic: newLogic,
        };
      }

      const growthRate = getGrowthRate(newLogic);
      const monthKeys = Object.keys(prev.months);
      const updatedMonths = { ...prev.months };

      const lastActualMonth = monthKeys
        .reverse()
        .find((month) => prev.months[month].isActual);

      if (!lastActualMonth) return prev;

      const baseValue = prev.months[lastActualMonth].value;
      let currentValue = baseValue;

      monthKeys.forEach((month) => {
        if (!prev.months[month].isActual) {
          const randomFactor = Math.random() * 0.2 - 0.1;
          currentValue = currentValue * (1 + growthRate + randomFactor);
          updatedMonths[month] = {
            ...prev.months[month],
            value: Math.round(currentValue),
            isManuallyModified: false,
          };
        }
      });

      return {
        ...prev,
        forecastLogic: newLogic,
        months: updatedMonths,
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

  const handleSave = () => {
    if (editedData) {
      onSave(editedData);
      setHasChanges(false);
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
              <Typography>{editedData.market}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Item:</Typography>
              <Typography>{editedData.item}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Logic:</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editedData.forecastLogic}
                  onChange={handleLogicChange}
                >
                  {forecastLogicOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
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
                  value: editedData?.months[month].value || 0,
                  isActual: editedData?.months[month].isActual,
                  isManuallyModified:
                    editedData?.months[month].isManuallyModified,
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
              value={editedData.commentary || ""}
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
