import { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Typography,
  useTheme,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { Toolbox } from "../volume/components/toolbox";

interface ForecastData {
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
}

interface Props {
  data: ForecastData[];
}

const MONTHS = [
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
];

export const ForecastByBrand = ({ data }: Props) => {
  const theme = useTheme();
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"table" | "graph">("graph");

  const handleBrandChange = (event: any) => {
    const { value } = event.target;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
  };

  const series = selectedBrands.map((brand, index) => {
    const brandData = data.find((item) => item.brand === brand);
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ];

    return {
      label: brand,
      data: brandData
        ? [
            brandData.jan,
            brandData.feb,
            brandData.mar,
            brandData.apr,
            brandData.may,
            brandData.jun,
            brandData.jul,
            brandData.aug,
            brandData.sep,
            brandData.oct,
            brandData.nov,
            brandData.dec,
          ]
        : [],
      color: colors[index % colors.length],
    };
  });

  const tableColumns: Column[] = [
    { key: "brand", header: "Brand", align: "left" },
    { key: "jan", header: "Jan", align: "right" },
    { key: "feb", header: "Feb", align: "right" },
    { key: "mar", header: "Mar", align: "right" },
    { key: "apr", header: "Apr", align: "right" },
    { key: "may", header: "May", align: "right" },
    { key: "jun", header: "Jun", align: "right" },
    { key: "jul", header: "Jul", align: "right" },
    { key: "aug", header: "Aug", align: "right" },
    { key: "sep", header: "Sep", align: "right" },
    { key: "oct", header: "Oct", align: "right" },
    { key: "nov", header: "Nov", align: "right" },
    { key: "dec", header: "Dec", align: "right" },
  ];

  const filteredData =
    selectedBrands.length > 0
      ? data.filter((item) => selectedBrands.includes(item.brand))
      : data;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 500,
          }}
        >
          Forecast By Brand
        </Typography>
        <Toolbox
          tools={["viewToggle"]}
          onUndo={() => Promise.resolve()}
          onExport={() => {}}
          onViewToggle={() =>
            setViewType(viewType === "table" ? "graph" : "table")
          }
          canUndo={false}
          viewType={viewType}
        />
      </Box>

      <FormControl sx={{ mb: 3, width: "100%" }}>
        <InputLabel id="brand-select-label">Select Brands</InputLabel>
        <Select
          labelId="brand-select-label"
          multiple
          value={selectedBrands}
          onChange={handleBrandChange}
          input={<OutlinedInput label="Select Brands" />}
          renderValue={(selected) => (selected as string[]).join(", ")}
        >
          {data.map((item) => (
            <MenuItem key={item.brand} value={item.brand}>
              {item.brand}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ width: "100%", height: 400 }}>
        {viewType === "graph" ? (
          selectedBrands.length > 0 && (
            <LineChart
              xAxis={[
                {
                  data: MONTHS,
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
          )
        ) : (
          <DynamicTable
            data={filteredData}
            columns={tableColumns}
            getRowId={(row) => row.brand}
          />
        )}
      </Box>
    </Box>
  );
};
