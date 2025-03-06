import {
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Box,
  SelectChangeEvent,
  Collapse,
  IconButton,
} from "@mui/material";
import { useState, useMemo } from "react";
import { useForecast } from "../data/data";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";

type ViewLevel = "BRAND" | "VARIANT";
type ViewType = "DEPLETION" | "SHIPMENT";

interface SummaryData {
  key: string;
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
    };
  };
  total: number;
  budgetTotal: number;
  [key: `month_${string}`]: number;
}

export const Summary = () => {
  const { forecastData, budgetData, shipmentData } = useForecast();
  const [viewLevel, setViewLevel] = useState<ViewLevel>("VARIANT");
  const [expanded, setExpanded] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("DEPLETION");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleViewChange = (event: SelectChangeEvent<ViewLevel>) => {
    setViewLevel(event.target.value as ViewLevel);
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: ViewType
  ) => {
    setViewType(newValue);
  };

  const calculateVariance = (forecast: number, budget: number) => {
    if (budget === 0) return 0;
    return ((forecast - budget) / budget) * 100;
  };

  const summarizedData = useMemo(() => {
    const dataToSummarize =
      viewType === "DEPLETION" ? forecastData : shipmentData;
    const budgetToSummarize = viewType === "DEPLETION" ? budgetData : [];

    const summaryMap = new Map<string, SummaryData>();

    dataToSummarize.forEach((item) => {
      const key = viewLevel === "BRAND" ? item.brand : item.variant;

      if (!summaryMap.has(key)) {
        const newSummary = {
          key,
          months: Object.keys(item.months).reduce((acc, month) => {
            acc[month] = {
              value: 0,
              isActual: month === "JAN", // Set January as actual
            };
            return acc;
          }, {} as { [key: string]: { value: number; isActual: boolean } }),
          total: 0,
          budgetTotal: 0,
        } as SummaryData;

        // Add flattened month data
        Object.keys(item.months).forEach((month) => {
          newSummary[`month_${month}`] = 0;
        });

        summaryMap.set(key, newSummary);
      }

      const summary = summaryMap.get(key)!;
      Object.entries(item.months).forEach(([month, data]) => {
        summary.months[month].value += data.value;
        summary[`month_${month}`] += data.value;
      });
      summary.total = Object.values(summary.months).reduce(
        (a, b) => a + b.value,
        0
      );
    });

    // Only calculate budget totals for depletions
    if (viewType === "DEPLETION") {
      budgetToSummarize.forEach((item) => {
        const key = viewLevel === "BRAND" ? item.brand : item.variant;
        if (summaryMap.has(key)) {
          const summary = summaryMap.get(key)!;
          Object.entries(item.months).forEach(([month, data]) => {
            if (summary.months.hasOwnProperty(month)) {
              summary.budgetTotal += data.value;
            }
          });
        }
      });
    }

    return Array.from(summaryMap.values());
  }, [forecastData, budgetData, shipmentData, viewLevel, viewType]);

  const columns: Column[] = useMemo(() => {
    const baseColumns: Column[] = [{ key: "key", header: viewLevel }];

    // Add month columns with subheaders
    const monthColumns = Object.keys(forecastData[0].months).map((month) => ({
      key: `month_${month}`,
      header: month,
      subHeader: month === "JAN" ? "ACT" : "FCST",
      align: "right" as const,
      render: (_value: number, row: SummaryData) => (
        <Box
          sx={{
            color: row.months[month].isActual ? "primary.main" : "inherit",
          }}
        >
          {row.months[month].value.toLocaleString()}
        </Box>
      ),
    }));

    const totalAndBudgetColumns: Column[] = [
      {
        key: "total",
        header: "TOTAL",
        align: "right" as const,
        render: (value: number) => value?.toLocaleString(),
      },
    ];

    if (viewType === "DEPLETION") {
      totalAndBudgetColumns.push(
        {
          key: "budgetTotal",
          header: "BUDGET",
          align: "right" as const,
          render: (value: number) => value?.toLocaleString(),
        },
        {
          key: "variance",
          header: "% vs BUD",
          align: "right" as const,
          render: (_value: number, row: SummaryData) => {
            const variance = calculateVariance(row.total, row.budgetTotal);
            return (
              <Box sx={{ color: variance < 0 ? "error.main" : "success.main" }}>
                {variance.toFixed(1)}%
              </Box>
            );
          },
        }
      );
    }

    return [...baseColumns, ...monthColumns, ...totalAndBudgetColumns];
  }, [viewLevel, viewType, forecastData]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton size="small">
          {expanded ? <RemoveIcon /> : <AddIcon />}
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          VOLUME SUMMARY (9L)
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              mb: 3,
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "0.875rem",
              }}
            >
              VIEW:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={viewLevel}
                onChange={handleViewChange}
                size="small"
                sx={{ fontSize: "0.875rem" }}
              >
                <MenuItem value="BRAND">Brand</MenuItem>
                <MenuItem value="VARIANT">Variant</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Tabs value={viewType} onChange={handleTabChange}>
              <Tab value="DEPLETION" label="Depletion" />
              <Tab value="SHIPMENT" label="Shipment" />
            </Tabs>
          </Box>

          <DynamicTable
            columns={columns}
            data={summarizedData}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            getRowId={(row) => row.key}
          />
        </Box>
      </Collapse>
    </Paper>
  );
};
