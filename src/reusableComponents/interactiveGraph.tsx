import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Collapse,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckIcon from "@mui/icons-material/Check";

export interface TimeSeriesData {
  id: string;
  label: string;
  data: { month: string; value: number }[];
  color?: string;
}

interface TrendLine {
  id: string;
  label: string;
  data: { month: string; value: number }[];
  color: string;
}

interface InteractiveGraphProps {
  datasets: TimeSeriesData[];
  height?: number;
  width?: number;
  availableTrendLines?: TrendLine[];
  onTrendLineAdd?: (trendLineId: string) => void;
  onTrendLineRemove?: (trendLineId: string) => void;
  primaryLabel?: string;
  label: string;
  defaultExpanded?: boolean;
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

export const InteractiveGraph = ({
  datasets,
  height = 300,
  width,
  availableTrendLines = [],
  onTrendLineAdd,
  onTrendLineRemove,
  primaryLabel = "Primary Forecast",
  label,
  defaultExpanded = true,
}: InteractiveGraphProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  if (!datasets.length) {
    return (
      <Box
        sx={{
          width: "100%",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">No data to display</Typography>
      </Box>
    );
  }

  const normalizedData = datasets.map((dataset) => ({
    ...dataset,
    data: MONTHS.map((month) => {
      const existingData = dataset.data.find((d) => d.month === month);
      const value = existingData?.value ?? 0;
      return {
        month,
        value: isNaN(value) ? 0 : value,
      };
    }),
  }));

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
        <Box
          sx={{
            height,
            p: 2,
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            {availableTrendLines.length > 0 && (
              <IconButton
                onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          <LineChart
            series={normalizedData.map((dataset) => ({
              data: dataset.data.map((d) => {
                const value = Number(d.value);
                return isNaN(value) ? 0 : value;
              }),
              label: dataset.id === "forecast" ? primaryLabel : dataset.label,
              color: dataset.color || undefined,
              showMark: true,
            }))}
            xAxis={[
              {
                data: MONTHS,
                scaleType: "point",
                tickLabelStyle: {
                  angle: 45,
                  textAnchor: "start",
                },
              },
            ]}
            height={height - 32}
            width={width || undefined}
            sx={{
              ".MuiLineElement-root": {
                strokeWidth: 2,
              },
              ".MuiMarkElement-root": {
                strokeWidth: 2,
                scale: "0.6",
                fill: "currentColor",
              },
            }}
          />

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={() => setMenuAnchorEl(null)}
          >
            {availableTrendLines.map((trendLine) => {
              const isSelected = datasets.some(
                (dataset) => dataset.id === trendLine.id
              );
              return (
                <MenuItem
                  key={trendLine.id}
                  onClick={() => {
                    if (isSelected) {
                      onTrendLineRemove?.(trendLine.id);
                    } else {
                      onTrendLineAdd?.(trendLine.id);
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  {trendLine.label}
                  <Box
                    sx={{
                      width: 24,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && <CheckIcon fontSize="small" />}
                  </Box>
                </MenuItem>
              );
            })}
          </Menu>
        </Box>
      </Collapse>
    </Box>
  );
};
