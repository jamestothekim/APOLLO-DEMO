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
}

export const MonthlyValues: React.FC<MonthlyValuesProps> = ({
  quarterGroups,
  onMonthValueChange,
  label = "MONTHLY VALUES",
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Track input values locally to handle display and edits more cleanly
  const [localInputValues, setLocalInputValues] = useState<
    Record<string, string | undefined>
  >({});

  // Helper function to format display values consistently
  const formatDisplayValue = (value: number): string => {
    // Format with one decimal place, preserving decimal display
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  // Get display value for the input field
  const getDisplayValue = (monthData: MonthData): string => {
    const monthKey = `${monthData.month}`;
    // If there's a local editing value, use that, otherwise format the stored value
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

    // Store the raw input value for display purposes
    setLocalInputValues((prev) => ({
      ...prev,
      [monthKey]: rawValue,
    }));

    // Pass the raw string value to parent component
    onMonthValueChange(monthData.month, rawValue);
  };

  const handleInputBlur = (monthKey: string) => {
    // Clear local value on blur to revert to formatted display value
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
              {months.map((monthData) => (
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
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Collapse>
    </Box>
  );
};
