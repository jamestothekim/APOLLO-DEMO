import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Typography,
  IconButton,
} from "@mui/material";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { FORECAST_OPTIONS } from "./depletions/util/depletionsUtil";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Toolbox } from "./components/toolbox";

interface SummaryData {
  brand: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total: number;
}

export const Summary = () => {
  const [forecastMethod, setForecastMethod] = useState("flat");
  const [data, setData] = useState<SummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/volume/summary-forecast?forecastMethod=${forecastMethod}`
        );
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();

        // Add IDs to the data
        const dataWithIds = result.map((row: SummaryData) => ({
          ...row,
          id: row.brand, // Use brand as unique identifier
        }));

        setData(dataWithIds);
      } catch (error) {
        console.error("Error fetching summary data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [forecastMethod]);

  const handleMethodChange = (event: SelectChangeEvent) => {
    setForecastMethod(event.target.value);
  };

  const columns: Column[] = [
    {
      key: "brand",
      header: "BRAND",
      align: "left",
    },
    {
      key: "jan",
      header: "JAN",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "feb",
      header: "FEB",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "mar",
      header: "MAR",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "apr",
      header: "APR",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "may",
      header: "MAY",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "jun",
      header: "JUN",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "jul",
      header: "JUL",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "aug",
      header: "AUG",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "sep",
      header: "SEP",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "oct",
      header: "OCT",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "nov",
      header: "NOV",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "dec",
      header: "DEC",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "total",
      header: "TOTAL",
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
  ];

  // Add handlers for Toolbox
  const handleColumns = () => {
    // Add column handling logic
    console.log("Columns clicked");
  };

  const dummyUndo = async () => {
    // Empty function since we don't need undo functionality
    return Promise.resolve();
  };

  const dummyExport = () => {
    // Empty function since we don't need export functionality
  };

  return (
    <Paper elevation={3}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: (theme) => theme.palette.primary.main,
            }}
          >
            SUMMARY FORECAST
          </Typography>
          <IconButton
            onClick={() => setIsMinimized(!isMinimized)}
            size="small"
            sx={{ ml: 2 }}
          >
            {isMinimized ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>

        <Box
          sx={{
            display: isMinimized ? "none" : "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ p: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="forecast-method-label">
                Forecast Method
              </InputLabel>
              <Select
                labelId="forecast-method-label"
                value={forecastMethod}
                label="Forecast Method"
                onChange={handleMethodChange}
              >
                {FORECAST_OPTIONS.map((option) => (
                  <MenuItem key={option.id} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ px: 2 }}>
            <Toolbox
              tools={["columns", "export"]}
              onUndo={dummyUndo}
              onColumns={handleColumns}
              onExport={dummyExport}
              canUndo={false}
            />
          </Box>

          <DynamicTable
            data={data}
            columns={columns}
            loading={isLoading}
            rowsPerPageOptions={[10, 20, 25, 50]}
            getRowId={(row) => row.id}
            selectedRow={null}
          />
        </Box>
      </Box>
    </Paper>
  );
};
