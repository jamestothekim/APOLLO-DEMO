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
  useTheme,
  OutlinedInput,
  Chip,
} from "@mui/material";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import {
  FORECAST_OPTIONS,
  exportToCSV,
} from "./depletions/util/depletionsUtil";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Toolbox } from "./components/toolbox";
import { LineChart } from "@mui/x-charts";

interface SummaryData {
  id: string;
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

const DEFAULT_SELECTED_BRANDS = [
  "Balvenie",
  "Glenfiddich",
  "Leyenda Del Milagro",
  "Hendricks",
  "Tullamore Dew",
  "Reyka",
  "Clan MacGregor",
  "Monkey Shoulder",
];

export const Summary = () => {
  const [forecastMethod, setForecastMethod] = useState("flat");
  const [data, setData] = useState<SummaryData[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewType, setViewType] = useState<"table" | "graph">("table");
  const theme = useTheme();
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    DEFAULT_SELECTED_BRANDS
  );
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsBrandsLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/volume/brands`
        );
        if (!response.ok) throw new Error("Failed to fetch brands");
        const data = await response.json();
        setAvailableBrands(data);
      } catch (error) {
        console.error("Error loading brands:", error);
      } finally {
        setIsBrandsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/volume/summary-forecast?forecastMethod=${forecastMethod}`
        );
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();

        // Filter the data based on selected brands
        const filteredResult = result.filter((row: SummaryData) =>
          selectedBrands.includes(row.brand)
        );

        const dataWithIds = filteredResult.map((row: SummaryData) => ({
          ...row,
          id: row.brand,
        }));

        setData(dataWithIds);
      } catch (error) {
        console.error("Error fetching summary data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedBrands.length > 0) {
      fetchData();
    }
  }, [forecastMethod, selectedBrands]);

  const handleMethodChange = (event: SelectChangeEvent) => {
    setForecastMethod(event.target.value);
  };

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
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

  const handleExport = () => {
    const formattedData = data.map((row) => ({
      id: row.id,
      market_id: "0",
      market_name: "",
      product: "",
      brand: row.brand,
      variant: "",
      variantSize: "",
      forecastLogic: forecastMethod,
      months: {
        JAN: { value: row.jan },
        FEB: { value: row.feb },
        MAR: { value: row.mar },
        APR: { value: row.apr },
        MAY: { value: row.may },
        JUN: { value: row.jun },
        JUL: { value: row.jul },
        AUG: { value: row.aug },
        SEP: { value: row.sep },
        OCT: { value: row.oct },
        NOV: { value: row.nov },
        DEC: { value: row.dec },
      },
    }));

    exportToCSV(formattedData);
  };

  const series = data.map((row, index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ];

    return {
      label: row.brand,
      data: [
        row.jan,
        row.feb,
        row.mar,
        row.apr,
        row.may,
        row.jun,
        row.jul,
        row.aug,
        row.sep,
        row.oct,
        row.nov,
        row.dec,
      ],
      color: colors[index % colors.length],
    };
  });

  return (
    <Paper elevation={3}>
      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
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
              {isMinimized ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowUpIcon />
              )}
            </IconButton>
          </Box>

          <Box
            sx={{
              display: isMinimized ? "none" : "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ p: 2, display: "flex", gap: 2 }}>
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

              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel id="brand-select-label">Brands</InputLabel>
                <Select
                  labelId="brand-select-label"
                  multiple
                  value={selectedBrands}
                  onChange={handleBrandChange}
                  input={<OutlinedInput label="Brands" />}
                  disabled={isBrandsLoading}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: "16px",
                            backgroundColor: "transparent",
                            "& .MuiChip-label": {
                              px: 1,
                            },
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableBrands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ px: 2 }}>
              <Toolbox
                tools={["columns", "export", "viewToggle"]}
                onUndo={dummyUndo}
                onColumns={handleColumns}
                onExport={handleExport}
                onViewToggle={() =>
                  setViewType(viewType === "table" ? "graph" : "table")
                }
                canUndo={false}
                viewType={viewType}
              />
            </Box>

            {viewType === "table" ? (
              <DynamicTable
                data={data}
                columns={columns}
                rowsPerPageOptions={[10, 20, 25, 50]}
                getRowId={(row) => row.id}
                selectedRow={null}
                loading={isLoading}
              />
            ) : (
              <Box sx={{ width: "100%", height: 400, p: 2 }}>
                <LineChart
                  xAxis={[
                    {
                      data: [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ],
                      scaleType: "band",
                      label: "Months",
                      labelStyle: {
                        fill: theme.palette.primary.main,
                      },
                      tickLabelStyle: {
                        fill: theme.palette.text.primary,
                      },
                    },
                  ]}
                  series={series}
                  height={350}
                  margin={{ left: 90, right: 20, top: 50, bottom: 30 }}
                  slotProps={{
                    legend: {
                      direction: "row",
                      position: { vertical: "top", horizontal: "middle" },
                      padding: 0,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
