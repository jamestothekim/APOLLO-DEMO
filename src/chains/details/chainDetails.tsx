import { useEffect, useState } from "react";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";
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
  Tabs,
  Tab,
  IconButton,
  SelectChangeEvent,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { DynamicTable } from "../../reusableComponents/dynamicTable";
import { Toolbox } from "../../volume/components/toolbox";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import {
  generateChainHistoricalData,
  generateChainInvoiceData,
  ChainHistoricalData,
  ChainInvoiceData,
} from "../chainPlayData/chainPlayData";

interface ChainDetailsProps {
  chainName: string;
  market: string;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Add period type
type Period = "R12" | "2024";

const ChainDetails: React.FC<ChainDetailsProps> = ({
  chainName,
  market,
  onClose,
}) => {
  const theme = useTheme();
  const [chainData, setChainData] = useState<ChainHistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"table" | "graph">("graph");
  const [tabValue, setTabValue] = useState(0);
  const [invoiceData, setInvoiceData] = useState<ChainInvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("R12");

  useEffect(() => {
    const fetchChainDetails = async () => {
      try {
        setIsLoading(true);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        const data = generateChainHistoricalData(chainName, market);
        setChainData(data);

        // Set initial brand selection
        const uniqueBrands = [...new Set(data.map((d) => d.brand))];
        setSelectedBrands(uniqueBrands.slice(0, 3)); // Select first 3 brands by default
      } catch (err) {
        console.error("Error fetching chain details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch chain details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (chainName && market) {
      fetchChainDetails();
    }
  }, [chainName, market, selectedPeriod]);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setIsLoadingInvoices(true);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const data = generateChainInvoiceData(chainName, market);
        setInvoiceData(data);
      } catch (err) {
        console.error("Error fetching invoice data:", err);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    if (chainName && market && tabValue === 1) {
      fetchInvoiceData();
    }
  }, [chainName, market, tabValue, selectedPeriod]);

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedBrands(event.target.value as string[]);
  };

  const handlePeriodChange = (event: SelectChangeEvent<Period>) => {
    setSelectedPeriod(event.target.value as Period);
  };

  const getMonthLabels = () => {
    if (selectedPeriod === "2024") {
      return [
        "JAN 24",
        "FEB 24",
        "MAR 24",
        "APR 24",
        "MAY 24",
        "JUN 24",
        "JUL 24",
        "AUG 24",
        "SEP 24",
        "OCT 24",
        "NOV 24",
        "DEC 24",
      ];
    } else {
      // R12
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based

      const months = [];
      let month = currentMonth - 1; // Start from previous month
      let year = currentYear;

      for (let i = 0; i < 12; i++) {
        if (month < 0) {
          month = 11;
          year--;
        }
        const monthName = new Date(year, month)
          .toLocaleString("default", { month: "short" })
          .toUpperCase();
        const yearSuffix = year.toString().slice(2);
        months.unshift(`${monthName} ${yearSuffix}`);
        month--;
      }

      return months;
    }
  };

  const aggregateByBrand = (data: ChainHistoricalData[]) => {
    const brandMap = new Map<string, number[]>();
    const monthLabels = getMonthLabels();

    data.forEach((item) => {
      if (!brandMap.has(item.brand)) {
        brandMap.set(item.brand, new Array(12).fill(0));
      }

      let monthIndex;
      if (selectedPeriod === "2024") {
        // For 2024, use calendar month index (1-based to 0-based)
        monthIndex = Number(item.month) - 1;
      } else {
        // For R12, calculate position based on year and month
        const itemDate = new Date(Number(item.year), Number(item.month) - 1);
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1);
        const monthDiff =
          (itemDate.getFullYear() - startDate.getFullYear()) * 12 +
          (itemDate.getMonth() - startDate.getMonth());
        monthIndex = monthDiff + 11; // Adjust to array index (0-11)
      }

      if (monthIndex >= 0 && monthIndex < 12) {
        const quantity = Number(item.case_equivalent_quantity);
        if (!isNaN(quantity)) {
          brandMap.get(item.brand)![monthIndex] += quantity;
        }
      }
    });

    return { brandMap, monthLabels };
  };

  const { brandMap, monthLabels } = aggregateByBrand(chainData);

  const series = selectedBrands.map((brand, index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ];

    return {
      label: brand,
      data: brandMap.get(brand) || new Array(12).fill(0),
      color: colors[index % colors.length],
      valueFormatter: (value: number | null) => {
        if (value === null || isNaN(value)) return "";
        return `${value.toFixed(1)} cases`;
      },
    };
  });

  const tableColumns = [
    {
      key: "variant_size_pack_desc",
      header: "Size Pack",
      align: "left" as const,
      filterable: true,
    },
    ...monthLabels.map((month, index) => ({
      key: index.toString(),
      header: month,
      align: "right" as const,
      render: (value: number) => {
        return value ? value.toFixed(2) : "0.00";
      },
    })),
  ];

  const tableData = [
    ...new Set(
      chainData
        .filter((d) => selectedBrands.includes(d.brand))
        .map((item) => item.variant_size_pack_desc)
    ),
  ].map((sizePack) => {
    const row: Record<string, unknown> = { variant_size_pack_desc: sizePack };
    monthLabels.forEach((_, index) => {
      const monthData = chainData.filter((d) => {
        if (selectedPeriod === "2024") {
          return (
            d.variant_size_pack_desc === sizePack &&
            Number(d.month) === index + 1 &&
            Number(d.year) === 2024 &&
            selectedBrands.includes(d.brand)
          );
        } else {
          const itemDate = new Date(Number(d.year), Number(d.month) - 1);
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth() - 1);
          const monthDiff =
            (itemDate.getFullYear() - startDate.getFullYear()) * 12 +
            (itemDate.getMonth() - startDate.getMonth());
          return (
            d.variant_size_pack_desc === sizePack &&
            monthDiff === index - 11 &&
            selectedBrands.includes(d.brand)
          );
        }
      });

      const value = monthData.reduce((sum, d) => {
        const qty = Number(d.case_equivalent_quantity);
        return sum + (isNaN(qty) ? 0 : qty);
      }, 0);

      row[index] = value;
    });
    return row;
  });

  const invoiceColumns = [
    {
      header: "Invoice Date",
      key: "invoice_date",
      align: "left" as const,
      filterable: true,
      render: (value: string) => {
        // Format ISO timestamp to YYYY-MM-DD
        if (!value) return "";
        try {
          const date = new Date(value);
          return date.toISOString().split("T")[0];
        } catch {
          return value;
        }
      },
    },
    {
      header: "Invoice #",
      key: "invoice_number",
      align: "left" as const,
      filterable: true,
    },
    {
      header: "Outlet",
      key: "outlet_name",
      align: "left" as const,
      filterable: true,
    },
    {
      header: "City/State",
      key: "city",
      align: "left" as const,
      filterable: true,
      render: (_: unknown, row: ChainInvoiceData) =>
        `${row.city}, ${row.state}`,
    },
    {
      header: "Brand",
      key: "brand",
      align: "left" as const,
      filterable: true,
    },
    {
      header: "Size Pack",
      key: "variant_size_pack_desc",
      align: "left" as const,
      filterable: true,
    },
    {
      header: "Cases (9L)",
      key: "case_equivalent_quantity",
      align: "right" as const,
      render: (value: number) => {
        return isNaN(value) ? "0.00" : value.toFixed(2);
      },
    },
    {
      header: "Sales",
      key: "sales_dollars",
      align: "right" as const,
      render: (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) {
          return "$0.00";
        }
        return `$${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
  ];

  if (isLoading) {
    return <LoadingProgress onComplete={() => {}} dataReady={!isLoading} />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Box sx={{ width: "100%", mt: -3 }}>
      {/* Header with back button and chain info */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          p: 3,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: -24,
          backgroundColor: "background.paper",
          zIndex: theme.zIndex.modal + 1,
          width: "calc(100% + 48px)",
          mx: -3,
          mt: -3,
          pt: 6,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flex: 1, mb: 1 }}>
          <IconButton onClick={onClose} sx={{ mr: 2 }} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ mr: 1.5, display: "flex", alignItems: "center" }}>
            <BusinessIcon sx={{ color: theme.palette.primary.main }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 500,
                color: theme.palette.primary.main,
              }}
            >
              {chainName.toUpperCase()}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 0.25,
              }}
            >
              {market} Market
            </Typography>
          </Box>
          <FormControl sx={{ minWidth: 120, ml: 2 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={handlePeriodChange}
              label="Period"
              size="small"
              sx={{
                backgroundColor: "background.paper",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
              }}
            >
              <MenuItem value="R12">Rolling 12</MenuItem>
              <MenuItem value="2024">2024</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={onClose} sx={{ ml: 2 }} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0,
            },
          }}
        >
          <Tab label="Trend" />
          <Tab label="Invoices" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControl sx={{ width: "75%", ml: "20px" }}>
              <InputLabel>Select Brands</InputLabel>
              <Select
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
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              >
                {[...new Set(chainData.map((item) => item.brand))].map(
                  (brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
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

          <Box sx={{ width: "100%", height: 480, mt: 2 }}>
            {viewType === "graph" ? (
              selectedBrands.length > 0 && (
                <LineChart
                  xAxis={[
                    {
                      data: monthLabels,
                      scaleType: "band",
                      tickLabelStyle: {
                        fill: theme.palette.text.primary,
                        fontSize: "0.75rem",
                        angle: 0,
                      },
                    },
                  ]}
                  series={series}
                  height={420}
                  margin={{
                    left: 35,
                    right: 0,
                    top: 20,
                    bottom: 60,
                  }}
                  slotProps={{
                    legend: {
                      direction: "row",
                      position: { vertical: "bottom", horizontal: "middle" },
                      padding: 0,
                      itemMarkWidth: 8,
                      itemMarkHeight: 8,
                      markGap: 5,
                      itemGap: 15,
                    },
                  }}
                  tooltip={{
                    trigger: "axis",
                  }}
                />
              )
            ) : (
              <DynamicTable
                data={tableData}
                columns={tableColumns}
                getRowId={(row: Record<string, unknown>) =>
                  row.variant_size_pack_desc as string
                }
                enableColumnFiltering={true}
              />
            )}
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box>
          {isLoadingInvoices ? (
            <LoadingProgress
              onComplete={() => {}}
              dataReady={!isLoadingInvoices}
            />
          ) : (
            <DynamicTable
              data={invoiceData}
              columns={invoiceColumns}
              getRowId={(row: ChainInvoiceData) =>
                `${row.invoice_number}-${row.outlet_id}-${row.variant_size_pack_id}`
              }
              enableColumnFiltering={true}
            />
          )}
        </Box>
      </TabPanel>
    </Box>
  );
};

export { ChainDetails };
