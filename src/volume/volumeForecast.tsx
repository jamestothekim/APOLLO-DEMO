import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  OutlinedInput,
  Select,
  Typography,
  SelectChangeEvent,
  MenuItem,
  Chip,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Collapse,
  InputLabel,
} from "@mui/material";
import { Depletions } from "./depletions/depletions";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useUser } from "../userContext";
import { Toolbox } from "./components/toolbox";
import type { ToolType } from "./components/toolbox";
import { BenchmarksDialog } from "./components/benchmarks";
import type { Benchmark } from "./components/benchmarks";
import axios from "axios";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`volume-tabpanel-${index}`}
      aria-labelledby={`volume-tab-${index}`}
      {...other}
      sx={{ mt: 2 }}
    >
      {value === index && children}
    </Box>
  );
};

// Add export to the interface
export interface MarketData {
  id: number;
  market_name: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  customers: any[];
  settings: any;
  raw: string;
}

// Add after MarketData interface
interface CustomerData {
  id: string;
  code: string;
  display: string;
  raw: string;
}

export const VolumeForecast: React.FC = () => {
  const { user } = useUser();
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [undoHandler, setUndoHandler] = useState<(() => Promise<void>) | null>(
    null
  );
  const [exportHandler, setExportHandler] = useState<(() => void) | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [rowsDialogOpen, setRowsDialogOpen] = useState(false);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<Benchmark[]>([]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/volume/brands`
        );
        setAvailableBrands(response.data);
      } catch (error) {
        console.error("Error loading brands:", error);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const userMarketIds = (user?.user_access?.Markets || []).map(
          (m) => m.id
        );
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL
          }/volume/get-markets?ids=${userMarketIds.join(",")}`
        );
        setMarketData(response.data);
      } catch (error) {
        console.error("Error loading market data:", error);
      }
    };

    if (user?.user_access?.Markets?.length) {
      fetchMarketData();
    }
  }, [user]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarketChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selectedValues = typeof value === "string" ? value.split(",") : value;
    setSelectedMarkets(selectedValues);
  };

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
  };

  const handleUndo = async () => {
    if (undoHandler) {
      await undoHandler();
    }
  };

  const handleExportClick = () => {
    if (exportHandler) {
      exportHandler();
    }
  };

  // Add this function inside the component
  const getCleanCustomerName = (customerData: string | undefined) => {
    if (!customerData) return "";
    const parts = customerData.split(" - ");
    return parts.length > 1 ? parts[1] : customerData;
  };

  // Update the filteredData mapping
  const filteredData: (MarketData | CustomerData)[] = isCustomerView
    ? marketData
        .filter((market) => market.settings?.managed_by === "Customer")
        .flatMap((market) =>
          (market.customers || []).map((customer) => ({
            id: customer.customer_id,
            code: customer.customer_id,
            display: getCleanCustomerName(customer.customer_actual_data),
            raw: customer.customer_actual_data,
          }))
        )
    : marketData.filter((market) => market.settings?.managed_by === "Market");

  // When marketData changes, set default selected markets
  useEffect(() => {
    if (!isCustomerView && marketData.length > 0) {
      // Initialize with no markets selected
      setSelectedMarkets([]);
    }
  }, [marketData, isCustomerView]);

  const isCustomerData = (
    item: MarketData | CustomerData
  ): item is CustomerData => {
    return "raw" in item;
  };

  // Add columns handler
  const handleColumns = () => {
    setColumnsDialogOpen(true);
  };

  const handleRows = () => {
    setRowsDialogOpen(true);
  };

  const handleApplyColumns = (selectedBenchmarks: Benchmark[]) => {
    console.log("Adding columns for benchmarks:", selectedBenchmarks);
    setSelectedBenchmarks(selectedBenchmarks);
  };

  const handleApplyRows = (selectedBenchmarks: any[]) => {
    console.log("Adding rows for benchmarks:", selectedBenchmarks);
    // This will be implemented later to add rows to the depletions table
  };

  // Add this function to handle view toggle
  const handleViewToggle = () => {
    setIsCustomerView(!isCustomerView);
    setSelectedMarkets([]); // Clear selected markets when switching views
    setSelectedBrands([]); // Also clear selected brands when switching views
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Volume Forecast
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!isCollapsed}>
        <Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>
                  Filter {isCustomerView ? "Customers" : "Markets"}
                </InputLabel>
                <Select
                  multiple
                  value={selectedMarkets}
                  onChange={handleMarketChange}
                  input={
                    <OutlinedInput
                      label={`Select ${
                        isCustomerView ? "Customers" : "Markets"
                      }`}
                    />
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={(() => {
                            if (isCustomerView) {
                              const item = filteredData.find(
                                (item) =>
                                  isCustomerData(item) && item.code === value
                              );
                              return item && isCustomerData(item)
                                ? getCleanCustomerName(item.raw)
                                : value;
                            } else {
                              const market = filteredData.find(
                                (item) =>
                                  !isCustomerData(item) &&
                                  item.market_id === value
                              ) as MarketData | undefined;
                              return market ? market.market_name : value;
                            }
                          })()}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: "16px",
                            backgroundColor: "transparent",
                            "& .MuiChip-label": { px: 1 },
                          }}
                          onDelete={() =>
                            setSelectedMarkets((prev) =>
                              prev.filter((market) => market !== value)
                            )
                          }
                        />
                      ))}
                    </Box>
                  )}
                >
                  {filteredData.map((item) => (
                    <MenuItem
                      key={isCustomerData(item) ? item.code : item.market_id}
                      value={isCustomerData(item) ? item.code : item.market_id}
                    >
                      {isCustomerData(item) ? item.display : item.market_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Filter Brands</InputLabel>
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
                          onDelete={() =>
                            setSelectedBrands((prev) =>
                              prev.filter((brand) => brand !== value)
                            )
                          }
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
          </Box>

          <Toolbox
            tools={[
              "undo" as ToolType,
              "columns" as ToolType,
              "rows" as ToolType,
              "export" as ToolType,
              ...(marketData.some((m) => m.settings?.managed_by === "Customer")
                ? ["customerToggle" as ToolType]
                : []),
            ]}
            onUndo={handleUndo}
            onColumns={handleColumns}
            onRows={handleRows}
            onExport={handleExportClick}
            onCustomerToggle={handleViewToggle}
            canUndo={true}
            isDepletionsView={true}
          />

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Depletion" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Depletions
              selectedMarkets={selectedMarkets}
              selectedBrands={selectedBrands}
              marketMetadata={marketData}
              isCustomerView={isCustomerView}
              onUndo={(handler) => setUndoHandler(() => handler)}
              onExport={(handler) => setExportHandler(() => handler)}
              onAvailableBrandsChange={setAvailableBrands}
              selectedBenchmarks={selectedBenchmarks}
            />
          </TabPanel>
        </Box>
      </Collapse>

      <BenchmarksDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        title="Add Columns"
        type="columns"
        onApply={handleApplyColumns}
      />

      <BenchmarksDialog
        open={rowsDialogOpen}
        onClose={() => setRowsDialogOpen(false)}
        title="Add Rows"
        type="rows"
        onApply={handleApplyRows}
      />
    </Paper>
  );
};
