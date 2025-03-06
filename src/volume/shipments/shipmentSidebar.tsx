import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  TARGET_DOI_OPTIONS,
  type ShipmentData,
  type TargetDOI,
} from "../../data/data";
import { InteractiveGraph } from "../../reusableComponents/interactiveGraph";
import { useTheme } from "@mui/material/styles";
import { MonthlyValues } from "../../reusableComponents/monthlyValues";
import { useForecast } from "../../data/data";

interface ShipmentSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: ShipmentData;
  onSave: (data: ShipmentData) => void;
}

export const ShipmentSidebar: React.FC<ShipmentSidebarProps> = ({
  open,
  onClose,
  selectedData,
  onSave,
}) => {
  const [editedData, setEditedData] = useState<ShipmentData | undefined>(
    undefined
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTrendLines, setSelectedTrendLines] = useState<string[]>([]);

  const theme = useTheme();
  const { budgetData } = useForecast();

  const trendLines = useMemo(() => {
    if (!editedData) return [];

    // Create distributor purchase plan data
    const distributorPlanData = Object.entries(editedData.months).map(
      ([month, data]) => {
        const baseValue = data.value;
        // Random value between -20% and +20% of the forecast
        const randomFactor = 0.8 + Math.random() * 0.4; // generates number between 0.8 and 1.2
        return {
          month,
          value: Math.round(baseValue * randomFactor),
        };
      }
    );

    const budgetRow = budgetData.find(
      (budget) => budget.id === `budget-${editedData.id}`
    );

    const trendLines = [
      {
        id: "distributor-plan",
        label: "Distributor Purchase Plan",
        data: distributorPlanData,
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

  const handleTrendLineAdd = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => [...prev, trendLineId]);
  }, []);

  const handleTrendLineRemove = useCallback((trendLineId: string) => {
    setSelectedTrendLines((prev) => prev.filter((id) => id !== trendLineId));
  }, []);

  useEffect(() => {
    setEditedData(selectedData);
    setHasChanges(false);
  }, [selectedData]);

  if (!editedData) return null;

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setEditedData((prev) => {
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

  const handleTargetDOIChange = (event: SelectChangeEvent<string>) => {
    const newTargetDOI = event.target.value as TargetDOI;
    setEditedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        targetDOI: newTargetDOI,
      };
    });
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months).reduce(
      (acc, curr) => acc + curr.value,
      0
    );
  };

  const handleSave = () => {
    if (editedData) {
      onSave(editedData);
      setHasChanges(false);
    }
  };

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
          <Typography variant="h6">Shipment Details</Typography>
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
              <Typography sx={{ fontWeight: 700 }}>Target DOI:</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editedData.targetDOI}
                  onChange={handleTargetDOIChange}
                >
                  {TARGET_DOI_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>On Hand:</Typography>
              <Typography>
                {editedData?.endInv?.toLocaleString() ?? "0"}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Shipment Type:</Typography>
              <Typography>
                {editedData.shipmentType === "DI"
                  ? "Direct"
                  : editedData.shipmentType}
              </Typography>
              <Typography sx={{ ml: 2, color: "text.secondary" }}>
                (Lead Time: {editedData.leadTime} days)
              </Typography>
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
          backgroundColor: "background.paper",
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
