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
} from "@mui/material";
import { Depletions } from "./depletions/depletions";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useUser } from "../userContext";
import { Toolbox } from "./components/toolbox";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

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
interface DistributorData {
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
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);
  const [undoHandler, setUndoHandler] = useState<
    (() => Promise<void>) | undefined
  >();
  const [exportHandler, setExportHandler] = useState<(() => void) | null>(null);

  // Add new state for market data
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isDistributorView, setIsDistributorView] = useState(false);

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
    const fetchMarketData = async () => {
      try {
        const userMarketIds = (user?.user_access?.Markets || []).map(
          (m) => m.id
        );
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/volume/get-markets?ids=${userMarketIds.join(",")}`
        );
        if (!response.ok) throw new Error("Failed to fetch market data");
        const markets = await response.json();
        console.log("Markets:", markets);
        setMarketData(markets);
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

  const hasCustomerManagedMarkets = marketData.some(
    (market) => market.settings?.managed_by === "Customer"
  );

  // Add this function inside the component
  const getCleanCustomerName = (customerData: string) => {
    // Example: "17009 - BELLBOY CORP - USD" -> "BELLBOY CORP"
    const parts = customerData.split(" - ");
    return parts.length > 1 ? parts[1] : customerData;
  };

  // Update the filteredData mapping
  const filteredData: (MarketData | DistributorData)[] = isDistributorView
    ? marketData
        .filter((market) => market.settings?.managed_by === "Customer")
        .flatMap((market) =>
          (market.customers || []).map((customer) => ({
            id: customer.customer_id,
            code: customer.customer_coding,
            display: getCleanCustomerName(customer.customer_actual_data),
            raw: customer.customer_actual_data,
          }))
        )
    : marketData.filter((market) => market.settings?.managed_by === "Market");

  const handleViewToggle = () => {
    setIsDistributorView(!isDistributorView);
    setSelectedMarkets([]);
  };

  const isDistributorData = (
    item: MarketData | DistributorData
  ): item is DistributorData => {
    return "raw" in item;
  };

  // Add columns handler
  const handleColumns = () => {
    // Will implement later
    console.log("Columns clicked in volumeForecast");
  };

  return (
    <Paper elevation={3}>
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
          VOLUME FORECAST (9L)
        </Typography>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          size="small"
          sx={{ ml: 2 }}
        >
          {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 2 }}>
          <Box
            sx={{
              mb: 4,
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              {hasCustomerManagedMarkets && (
                <IconButton
                  size="small"
                  onClick={handleViewToggle}
                  sx={{
                    border: "1px solid",
                    borderColor: "primary.main",
                    p: "4px",
                    "&:hover": {
                      backgroundColor: "primary.main",
                      color: "white",
                    },
                  }}
                  color="primary"
                >
                  <CompareArrowsIcon sx={{ fontSize: "1.2rem" }} />
                </IconButton>
              )}
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "0.875rem",
                }}
              >
                {isDistributorView ? "Distributor:" : "Market:"}
              </Typography>
              <FormControl sx={{ minWidth: "300px", flex: 1 }}>
                <Select
                  multiple
                  value={selectedMarkets}
                  onChange={handleMarketChange}
                  input={<OutlinedInput />}
                  size="small"
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return "Please select market";
                    }
                    return (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          maxWidth: "100%", // Ensure chips wrap within container
                        }}
                      >
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={
                              isDistributorView
                                ? getCleanCustomerName(
                                    filteredData.find(
                                      (item) =>
                                        isDistributorData(item) &&
                                        item.code === value
                                    )?.raw || value
                                  )
                                : filteredData.find(
                                    (item) =>
                                      !isDistributorData(item) &&
                                      (item as MarketData).market_id === value
                                  ) &&
                                  !isDistributorData(
                                    filteredData.find(
                                      (item) =>
                                        !isDistributorData(item) &&
                                        (item as MarketData).market_id === value
                                    )!
                                  )
                                ? (
                                    filteredData.find(
                                      (item) =>
                                        !isDistributorData(item) &&
                                        (item as MarketData).market_id === value
                                    ) as MarketData
                                  ).market_code
                                : value
                            }
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
                            onDelete={() =>
                              setSelectedMarkets((prev) =>
                                prev.filter((market) => market !== value)
                              )
                            }
                          />
                        ))}
                      </Box>
                    );
                  }}
                >
                  {filteredData.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={
                        isDistributorView
                          ? (item as DistributorData).code
                          : (item as MarketData).market_id
                      }
                    >
                      {isDistributorView
                        ? (item as DistributorData).display
                        : (item as MarketData).market_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "0.875rem",
                }}
              >
                Brand:
              </Typography>
              <FormControl sx={{ width: "300px" }}>
                <Select
                  multiple
                  value={selectedBrands}
                  onChange={handleBrandChange}
                  input={<OutlinedInput />}
                  disabled={isBrandsLoading}
                  size="small"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {isBrandsLoading
                        ? "Loading..."
                        : selected.map((value) => (
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
            tools={["undo", "columns", "export"]}
            onUndo={handleUndo}
            onColumns={handleColumns}
            onExport={handleExportClick}
            canUndo={!!undoHandler}
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
              onUndo={(handler) => setUndoHandler(() => handler)}
              onExport={(handler) => setExportHandler(() => handler)}
            />
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};
