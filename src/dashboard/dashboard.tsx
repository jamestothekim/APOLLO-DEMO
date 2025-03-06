import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useState, useMemo } from "react";
import { useForecast } from "../data/data";
import { useTheme } from "@mui/material/styles";
import BarsDataset from "./barsDataset";

export const Dashboard = () => {
  const { forecastData, budgetData } = useForecast();
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const theme = useTheme();

  const uniqueBrands = useMemo(() => {
    const brands = new Set(forecastData.map((data) => data.brand));
    return Array.from(brands);
  }, [forecastData]);

  const handleBrandChange = (event: SelectChangeEvent) => {
    setSelectedBrand(event.target.value);
  };

  const monthOrder = [
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

  // Prepare data for the chart
  const chartData = useMemo(() => {
    const filteredForecast =
      selectedBrand === "all"
        ? forecastData
        : forecastData.filter((data) => data.brand === selectedBrand);

    const filteredBudget =
      selectedBrand === "all"
        ? budgetData
        : budgetData.filter((data) => data.brand === selectedBrand);

    return monthOrder.map((month) => ({
      month,
      forecast: filteredForecast.reduce(
        (sum, item) => sum + (item.months[month]?.value || 0),
        0
      ),
      budget: filteredBudget.reduce(
        (sum, item) => sum + (item.months[month]?.value || 0),
        0
      ),
    }));
  }, [forecastData, budgetData, selectedBrand]);

  const chartSeries = [
    {
      dataKey: "forecast",
      label: "Forecast",
      color: theme.palette.primary.main,
    },
    {
      dataKey: "budget",
      label: "Budget",
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box sx={{ p: 4 }}>
      <FormControl sx={{ mb: 3, minWidth: 200 }}>
        <Select value={selectedBrand} onChange={handleBrandChange} displayEmpty>
          <MenuItem value="all">All Brands</MenuItem>
          {uniqueBrands.map((brand) => (
            <MenuItem key={brand} value={brand}>
              {brand}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <BarsDataset
        data={chartData}
        xKey="month"
        series={chartSeries}
        title={`Monthly Sales - ${
          selectedBrand === "all" ? "All Brands" : selectedBrand
        }`}
      />
    </Box>
  );
};
