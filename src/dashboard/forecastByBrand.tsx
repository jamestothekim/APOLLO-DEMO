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
  Chip,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { Toolbox } from "../volume/components/toolbox";
import { SelectChangeEvent } from "@mui/material/Select";

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

const DEFAULT_SELECTED_BRANDS = [
  "Balvenie",
  "Glenfiddich",
  "Leyenda Del Milagro",
  "Hendricks",
  "Tullamore Dew",
  "Reyka",
  "Monkey Shoulder",
];

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
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    DEFAULT_SELECTED_BRANDS
  );
  const [viewType, setViewType] = useState<"table" | "graph">("graph");

  const filteredData = data.filter((item) =>
    selectedBrands.includes(item.brand)
  );

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
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
            fontWeight: 500,
            color: (theme) => theme.palette.primary.main,
          }}
        >
          FORECAST BY BRAND
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
              series={filteredData.map((row, index) => ({
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
                color: series[index].color,
              }))}
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
