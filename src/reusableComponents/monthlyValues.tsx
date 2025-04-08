import React, { useState, ChangeEvent } from "react";
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  TextField,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";

interface MonthData {
  month: string;
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface QuarterGroup {
  label: string;
  months: MonthData[];
}

interface MonthlyValuesProps {
  quarterGroups: QuarterGroup[];
  onMonthValueChange: (month: string, value: string) => void;
  label?: string;
  defaultExpanded?: boolean;
  gsvRate?: number;
  benchmarkForecasts?: Array<{
    id: number;
    label: string;
    value: string;
    color: string;
  }>;
  availableBenchmarkData?: Record<string, number[]>;
}

export const MonthlyValues: React.FC<MonthlyValuesProps> = ({
  quarterGroups,
  onMonthValueChange,
  label = "MONTHLY VALUES",
  defaultExpanded = true,
  gsvRate,
  benchmarkForecasts = [],
  availableBenchmarkData = {},
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [localInputValues, setLocalInputValues] = useState<
    Record<string, string | undefined>
  >({});

  const formatDisplayValue = (value: number): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  const getDisplayValue = (monthData: MonthData): string => {
    const monthKey = `${monthData.month}`;
    return localInputValues[monthKey] !== undefined
      ? localInputValues[monthKey] || ""
      : formatDisplayValue(monthData.value);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    monthData: MonthData
  ) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const monthKey = `${monthData.month}`;
    setLocalInputValues((prev) => ({
      ...prev,
      [monthKey]: rawValue,
    }));
    onMonthValueChange(monthData.month, rawValue);
  };

  const handleInputBlur = (monthKey: string) => {
    setLocalInputValues((prev) => ({
      ...prev,
      [monthKey]: undefined,
    }));
  };

  return (
    <Box>
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
      </Box>

      <Collapse in={isExpanded}>
        {quarterGroups.map(({ label: quarterLabel, months }) => (
          <Box key={quarterLabel} sx={{ mb: 3 }}>
            <Typography
              sx={{
                mb: 1,
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              {quarterLabel}
            </Typography>
            <Grid container spacing={2}>
              {months.map((monthData, monthIndex) => {
                const quarterIndex = quarterGroups.findIndex(
                  (q) => q.label === quarterLabel
                );
                const globalIndex = quarterIndex * 3 + monthIndex;

                return (
                  <Grid item xs={4} key={monthData.month}>
                    <TextField
                      label={monthData.month}
                      value={getDisplayValue(monthData)}
                      onChange={(e) => handleInputChange(e, monthData)}
                      onBlur={() => handleInputBlur(monthData.month)}
                      size="small"
                      fullWidth
                      type="text"
                      InputProps={{
                        readOnly: monthData.isActual,
                        endAdornment: monthData.isManuallyModified ? (
                          <EditIcon
                            fontSize="small"
                            sx={{
                              color: (theme) => theme.palette.secondary.main,
                            }}
                          />
                        ) : null,
                        sx: {
                          "& .MuiInputBase-input": {
                            color: monthData.isManuallyModified
                              ? (theme) => theme.palette.secondary.main
                              : monthData.isActual
                              ? (theme) => theme.palette.primary.main
                              : "inherit",
                          },
                        },
                      }}
                    />

                    {benchmarkForecasts.map((benchmark) => {
                      const monthValues =
                        availableBenchmarkData[benchmark.value] || [];
                      if (monthValues.length === 0) return null;

                      const forecastValues = quarterGroups.flatMap(
                        ({ months }) =>
                          months.map((monthData) => monthData.value)
                      );

                      const benchmarkValue = monthValues[globalIndex] || 0;
                      const forecastValue = forecastValues[globalIndex];
                      const diff = forecastValue - benchmarkValue;
                      const percentDiff =
                        benchmarkValue !== 0
                          ? ((forecastValue - benchmarkValue) /
                              benchmarkValue) *
                            100
                          : 0;

                      return (
                        <Box
                          key={`${benchmark.id}-${monthData.month}`}
                          sx={{
                            mt: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            bgcolor: "background.paper",
                            p: 1,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                backgroundColor: benchmark.color,
                                borderRadius: "2px",
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {benchmark.label}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "80px 1fr",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Δ Vol:
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: diff < 0 ? "error.main" : "success.main",
                                textAlign: "right",
                              }}
                            >
                              {diff.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{" "}
                              ({Math.round(Math.abs(percentDiff))}%)
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "80px 1fr",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Δ GSV:
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: diff < 0 ? "error.main" : "success.main",
                                textAlign: "right",
                              }}
                            >
                              {(diff * (gsvRate || 0)).toLocaleString(
                                undefined,
                                {
                                  style: "currency",
                                  currency: "USD",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Collapse>
    </Box>
  );
};
