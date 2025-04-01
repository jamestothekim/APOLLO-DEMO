import { useEffect, useState } from "react";
import axios from "axios";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";
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
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { DynamicTable } from "../../../reusableComponents/dynamicTable";
import { Toolbox } from "../../components/toolbox";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import StorefrontIcon from "@mui/icons-material/Storefront";

interface AccountDetailsProps {
  outletId: string;
  onClose: () => void;
  cachedData?: AccountData[];
  onDataFetched: (data: AccountData[]) => void;
}

interface AccountData {
  outlet_id: string;
  outlet_name: string;
  address_line_1: string;
  city: string;
  state: string;
  vip_cot_premise_type_code: string;
  vip_cot_premise_type_desc: string;
  year: string;
  month: string;
  month_name: string;
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  case_equivalent_quantity: string;
  sales_dollars: number;
}

interface InvoiceData {
  outlet_id: string;
  outlet_name: string;
  city: string;
  state: string;
  premise_type: string;
  account_type: string;
  invoice_date: string;
  invoice_number: string;
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  quantity: number;
  case_equivalent_quantity: number;
  sales_dollars: number;
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

const AccountDetails: React.FC<AccountDetailsProps> = ({
  outletId,
  onClose,
  cachedData,
  onDataFetched,
}) => {
  const theme = useTheme();
  const [accountData, setAccountData] = useState<AccountData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"table" | "graph">("graph");
  const [tabValue, setTabValue] = useState(0);
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (cachedData) {
      console.log("Using cached account data:", cachedData);
      setAccountData(cachedData);
      setIsLoading(false);
      return;
    }

    const fetchAccountDetails = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching account details for outletId:", outletId);
        const response = await axios.get<AccountData[]>(
          `${import.meta.env.VITE_API_URL}/volume/account-details`,
          { params: { outletId } }
        );
        const data = response.data;
        console.log("Fetched account details:", data);
        setAccountData(data);
        onDataFetched(data); // Cache the fetched data
        // Set initial brand selection
        const uniqueBrands = [...new Set(data.map((d) => d.brand))];
        setSelectedBrands(uniqueBrands.slice(0, 3)); // Select first 3 brands by default
      } catch (err) {
        console.error("Error fetching account details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch account details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (outletId) {
      fetchAccountDetails();
    }
  }, [outletId, cachedData, onDataFetched]);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setIsLoadingInvoices(true);
        const response = await axios.get<InvoiceData[]>(
          `${import.meta.env.VITE_API_URL}/volume/account-invoices`,
          { params: { outletId } }
        );
        const data = response.data;
        console.log("Fetched invoice data:", data);
        setInvoiceData(data);
      } catch (err) {
        console.error("Error fetching invoice data:", err);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    if (outletId && tabValue === 1) {
      fetchInvoiceData();
    }
  }, [outletId, tabValue]);

  const handleBrandChange = (event: any) => {
    setSelectedBrands(event.target.value);
  };

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

  const { brandMap } = aggregateByBrand(accountData);

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
        const brand_data = accountData.filter((d) => d.brand === brand);
        const month_data = brand_data.filter(
          (d) => Number(d.case_equivalent_quantity) > 0
        );
        const variant_size_pack_summary: string[] = [
          ...new Set(month_data.map((d) => d.variant_size_pack_desc)),
        ];

        const summary = variant_size_pack_summary.map((pack) => {
          const value = month_data
            .filter((d) => d.variant_size_pack_desc === pack)
            .reduce((sum, d) => sum + Number(d.case_equivalent_quantity), 0);
          return `${pack} (${value.toFixed(0)} cases)`;
        });
        return summary.join("\n");
      },
    };
  });

  const tableColumns = [
    {
      key: "variant_size_pack_desc",
      header: "Size Pack",
      align: "left" as const,
    },
    ...MONTHS.map((month, index) => ({
      key: (index + 1).toString(),
      header: month,
      align: "right" as const,
      render: (value: number) => {
        return value ? value.toFixed(2) : "0.00";
      },
    })),
  ];

  const tableData = [
    ...new Set(
      accountData
        .filter((d) => selectedBrands.includes(d.brand))
        .map((item) => item.variant_size_pack_desc)
    ),
  ].map((sizePack) => {
    const row: any = { variant_size_pack_desc: sizePack };
    MONTHS.forEach((_, index) => {
      const monthNum = index + 1;
      const monthData = accountData.filter(
        (d) =>
          d.variant_size_pack_desc === sizePack &&
          Number(d.month) === monthNum &&
          selectedBrands.includes(d.brand)
      );

      // Sum up all case_equivalent_quantity values for this month
      const value = monthData.reduce((sum, d) => {
        const qty = Number(d.case_equivalent_quantity);
        return sum + (isNaN(qty) ? 0 : qty);
      }, 0);

      row[monthNum] = value;
    });
    return row;
  });

  const invoiceColumns = [
    {
      header: "Invoice Date",
      key: "invoice_date",
      align: "left" as const,
      render: (value: string) => {
        // Format YYYYMMDD to YYYY-MM-DD
        return value
          ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
          : "";
      },
    },
    {
      header: "Invoice #",
      key: "invoice_number",
      align: "left" as const,
    },
    {
      header: "Brand",
      key: "brand",
      align: "left" as const,
    },
    {
      header: "Size Pack",
      key: "variant_size_pack_desc",
      align: "left" as const,
    },
    {
      header: "Cases (Phys)",
      key: "quantity",
      align: "right" as const,
      render: (value: string) => {
        const num = Number(value);
        return isNaN(num) ? "0.00" : num.toFixed(2);
      },
    },
    {
      header: "Cases (9L)",
      key: "case_equivalent_quantity",
      align: "right" as const,
      render: (value: string) => {
        const num = Number(value);
        return isNaN(num) ? "0.00" : num.toFixed(2);
      },
    },
    {
      header: "Sales ($)",
      key: "sales_dollars",
      align: "right" as const,
      render: (value: number) => {
        return value ? value.toFixed(2) : "0.00";
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
    <Box sx={{ width: "100%" }}>
      {/* Header with back button and account info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          mb: 3,
        }}
      >
        <IconButton onClick={onClose} sx={{ mr: 2 }} aria-label="back">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {accountData.length > 0 && (
            <Box sx={{ mr: 1.5, display: "flex", alignItems: "center" }}>
              {accountData[0].vip_cot_premise_type_code
                ?.toLowerCase()
                .includes("on") ? (
                <RestaurantIcon sx={{ color: theme.palette.primary.main }} />
              ) : (
                <StorefrontIcon sx={{ color: theme.palette.primary.main }} />
              )}
            </Box>
          )}
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 500,
                color: theme.palette.primary.main,
              }}
            >
              {accountData.length > 0 && accountData[0].outlet_name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 0.25,
              }}
            >
              {accountData.length > 0 &&
                `${accountData[0].address_line_1}, ${accountData[0].city}, ${accountData[0].state}`}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Tab label="Trend" />
          <Tab label="Invoices" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>
              Sales Trend
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
              {[...new Set(accountData.map((item) => item.brand))].map(
                (brand) => (
                  <MenuItem key={brand} value={brand}>
                    {brand}
                  </MenuItem>
                )
              )}
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
                      labelStyle: { fill: theme.palette.primary.main },
                      tickLabelStyle: { fill: theme.palette.text.primary },
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
                  tooltip={{
                    trigger: "axis",
                  }}
                />
              )
            ) : (
              <DynamicTable
                data={tableData}
                columns={tableColumns}
                getRowId={(row) => row.variant_size_pack_desc}
              />
            )}
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{ color: theme.palette.primary.main, mb: 3 }}
          >
            Invoice History
          </Typography>
          {isLoadingInvoices ? (
            <LoadingProgress
              onComplete={() => {}}
              dataReady={!isLoadingInvoices}
            />
          ) : (
            <DynamicTable
              data={invoiceData}
              columns={invoiceColumns}
              getRowId={(row) =>
                `${row.invoice_number}-${row.variant_size_pack_desc}`
              }
            />
          )}
        </Box>
      </TabPanel>
    </Box>
  );
};

const aggregateByBrand = (data: AccountData[]) => {
  const brandMap = new Map<string, number[]>();

  data.forEach((item) => {
    if (!brandMap.has(item.brand)) {
      brandMap.set(item.brand, new Array(12).fill(0));
    }
    const monthIndex = Number(item.month) - 1;
    const quantity = Number(item.case_equivalent_quantity);
    if (!isNaN(quantity)) {
      brandMap.get(item.brand)![monthIndex] += quantity;
    }
  });

  return { brandMap };
};

export { AccountDetails };
