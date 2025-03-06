import React, { useState } from "react";
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
                    value={monthData.value.toLocaleString()}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, "");
                      onMonthValueChange(monthData.month, rawValue);
                    }}
                    size="small"
                    fullWidth
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
