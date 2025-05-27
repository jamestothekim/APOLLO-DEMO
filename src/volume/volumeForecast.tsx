import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Collapse,
  TextField,
  Autocomplete,
} from "@mui/material";
import { Depletions } from "./depletions/depletions";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Toolbox } from "./components/toolbox";
import type { ToolType } from "./components/toolbox";
import { GuidanceDialog } from "./components/guidance";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "../redux/store";
import {
  setPendingForecastCols,
  setPendingForecastRows,
  selectPendingGuidanceForecastColumns,
  selectPendingGuidanceForecastRows,
  selectAvailableGuidance,
  selectVolumeForecastMarkets,
  selectVolumeForecastBrands,
  selectVolumeForecastTags,
  setVolumeForecastMarkets,
  setVolumeForecastBrands,
  setVolumeForecastTags,
} from "../redux/slices/userSettingsSlice";
import type { Guidance } from "../redux/slices/userSettingsSlice";
import axios from "axios";

const MAX_CHIPS_VISIBLE = 3; // Define how many chips to show

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

// Keep MarketData definition here for now
export interface MarketData {
  id: number;
  market_name: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  customers: CustomerData[];
  settings: any;
  raw: string;
}

// Add after MarketData interface
interface CustomerData {
  id: string;
  code: string;
  display: string;
  raw: string;
  customer_id: string;
  customer_actual_data?: string;
  customer_coding?: string;
}

interface VolumeForecastProps {
  availableBrands: string[];
  marketData: MarketData[];
}

export const VolumeForecast: React.FC<VolumeForecastProps> = ({
  availableBrands,
  marketData,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const availableGuidance = useSelector(selectAvailableGuidance);
  const volumeForecastMarkets = useSelector(selectVolumeForecastMarkets);
  const volumeForecastBrands = useSelector(selectVolumeForecastBrands);
  const volumeForecastTags = useSelector(selectVolumeForecastTags);

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    volumeForecastMarkets
  );
  const [selectedBrands, setSelectedBrands] =
    useState<string[]>(volumeForecastBrands);
  const [selectedTags, setSelectedTags] =
    useState<number[]>(volumeForecastTags);
  const [availableTags, setAvailableTags] = useState<
    { tag_id: number; tag_name: string }[]
  >([]);
  const [tabValue, setTabValue] = useState(0);
  const [undoHandler, setUndoHandler] = useState<(() => Promise<void>) | null>(
    null
  );
  const [exportHandler, setExportHandler] = useState<(() => void) | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  // Sync with Redux state
  useEffect(() => {
    if (volumeForecastMarkets.length > 0) {
      setSelectedMarkets(volumeForecastMarkets);
    }
  }, [volumeForecastMarkets]);

  useEffect(() => {
    if (volumeForecastBrands.length > 0) {
      setSelectedBrands(volumeForecastBrands);
    }
  }, [volumeForecastBrands]);

  useEffect(() => {
    if (volumeForecastTags.length > 0) {
      setSelectedTags(volumeForecastTags);
    }
  }, [volumeForecastTags]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  const getCleanCustomerName = (customerData: string | undefined) => {
    if (!customerData) return "";
    const parts = customerData.split(" - ");
    return parts.length > 1 ? parts[1] : customerData;
  };

  // Log filtered data for debugging
  const filteredData: (MarketData | CustomerData)[] = useMemo(() => {
    const data = isCustomerView
      ? marketData
          .filter((market) => market.settings?.managed_by === "Customer")
          .flatMap((market) =>
            (market.customers || []).map((customer: any) => ({
              id: customer.customer_id,
              customer_id: customer.customer_id,
              code: customer.customer_id,
              display: getCleanCustomerName(customer.customer_actual_data),
              raw: customer.customer_actual_data,
              customer_actual_data: customer.customer_actual_data,
              customer_coding: customer.customer_coding,
            }))
          )
      : marketData.filter((market) => market.settings?.managed_by === "Market");

    return data;
  }, [isCustomerView, marketData]);

  const handleViewToggle = () => {
    const newIsCustomerView = !isCustomerView;
    setIsCustomerView(newIsCustomerView);
    // Only clear selections if we're switching views
    if (newIsCustomerView !== isCustomerView) {
      setSelectedMarkets([]);
      setSelectedBrands([]);
      setSelectedTags([]);
      // Clear Redux state when switching views
      dispatch(setVolumeForecastMarkets([]));
      dispatch(setVolumeForecastBrands([]));
      dispatch(setVolumeForecastTags([]));
    }
  };

  // Get selected Guidance objects directly from Redux using the reselect selectors
  const selectedGuidanceCols: Guidance[] = useSelector(
    selectPendingGuidanceForecastColumns
  );
  const selectedGuidanceRows: Guidance[] = useSelector(
    selectPendingGuidanceForecastRows
  );

  // Add useEffect to fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/product-tags`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setAvailableTags(response.data);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };
    fetchTags();
  }, []);

  const handleMarketsChange = (
    _: any,
    newValue: (MarketData | CustomerData)[]
  ) => {
    const newMarkets = newValue.map((item) =>
      isCustomerView
        ? (item as CustomerData).customer_coding || (item as CustomerData).code
        : (item as MarketData).market_id
    );
    setSelectedMarkets(newMarkets);
    dispatch(setVolumeForecastMarkets(newMarkets));
  };

  const handleBrandsChange = (_: any, newValue: string[]) => {
    setSelectedBrands(newValue);
    dispatch(setVolumeForecastBrands(newValue));
  };

  const handleTagsChange = (_: any, newValue: number[]) => {
    setSelectedTags(newValue);
    dispatch(setVolumeForecastTags(newValue));
  };

  const handleColumns = () => {
    setColumnsDialogOpen(true);
  };

  const handleApplyColumns = async (columns: Guidance[]) => {
    setColumnsDialogOpen(false);
    const columnIds = columns.map((col) => col.id);
    dispatch(setPendingForecastCols(columnIds));
  };

  const handleApplyRows = async (rows: Guidance[]) => {
    const rowIds = rows.map((row) => row.id);
    dispatch(setPendingForecastRows(rowIds));
  };

  const isCustomerData = (
    item: MarketData | CustomerData
  ): item is CustomerData => {
    return "code" in item && "display" in item;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            color: (theme) => theme.palette.primary.main,
          }}
        >
          VOLUME FORECAST
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!isCollapsed}>
        <Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                multiple
                limitTags={MAX_CHIPS_VISIBLE}
                options={filteredData}
                value={filteredData.filter((item) =>
                  selectedMarkets.includes(
                    isCustomerView
                      ? (item as CustomerData).customer_coding ||
                          (item as CustomerData).code
                      : (item as MarketData).market_id
                  )
                )}
                onChange={handleMarketsChange}
                isOptionEqualToValue={(option, value) =>
                  isCustomerView
                    ? (option as CustomerData).code ===
                      (value as CustomerData).code
                    : (option as MarketData).market_id ===
                      (value as MarketData).market_id
                }
                getOptionLabel={(option) =>
                  isCustomerData(option) ? option.display : option.market_name
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Filter ${isCustomerView ? "Customers" : "Markets"}`}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const label = isCustomerData(option)
                      ? option.display
                      : option.market_name;
                    return (
                      <Chip
                        label={label}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{
                          borderRadius: "16px",
                          backgroundColor: "transparent",
                          "& .MuiChip-label": { px: 1 },
                        }}
                        {...getTagProps({ index })}
                      />
                    );
                  })
                }
                sx={{ width: "100%" }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Autocomplete
                multiple
                limitTags={MAX_CHIPS_VISIBLE}
                options={availableBrands}
                value={selectedBrands}
                onChange={(_, newValue) => {
                  handleBrandsChange(_, newValue);
                }}
                getOptionLabel={(option) => option}
                renderInput={(params) => (
                  <TextField {...params} label="Filter Brands" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{
                        borderRadius: "16px",
                        backgroundColor: "transparent",
                        "& .MuiChip-label": { px: 1 },
                      }}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                sx={{ width: "100%" }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Autocomplete
                multiple
                limitTags={MAX_CHIPS_VISIBLE}
                options={availableTags}
                value={availableTags.filter((tag) =>
                  selectedTags.includes(tag.tag_id)
                )}
                onChange={(_, newValue) => {
                  handleTagsChange(
                    _,
                    newValue.map((tag) => tag.tag_id)
                  );
                }}
                getOptionLabel={(option) => option.tag_name}
                renderInput={(params) => (
                  <TextField {...params} label="Filter Tags" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.tag_name}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{
                        borderRadius: "16px",
                        backgroundColor: "transparent",
                        "& .MuiChip-label": { px: 1 },
                      }}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                sx={{ width: "100%" }}
              />
            </Box>
          </Box>

          <Toolbox
            tools={[
              "undo" as ToolType,
              "columns" as ToolType,
              "export" as ToolType,
              ...(marketData.some((m) => m.settings?.managed_by === "Customer")
                ? ["customerToggle" as ToolType]
                : []),
            ]}
            onUndo={handleUndo}
            onColumns={handleColumns}
            onExport={handleExportClick}
            onCustomerToggle={handleViewToggle}
            canUndo={true}
            isDepletionsView={true}
            isCustomerView={isCustomerView}
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
              selectedTags={selectedTags}
              marketMetadata={marketData}
              isCustomerView={isCustomerView}
              onUndo={(handler) => setUndoHandler(() => handler)}
              onExport={(handler) => setExportHandler(() => handler)}
              selectedGuidance={selectedGuidanceCols}
              rowGuidanceSelections={selectedGuidanceRows}
            />
          </TabPanel>
        </Box>
      </Collapse>

      <GuidanceDialog
        open={columnsDialogOpen}
        onClose={() => setColumnsDialogOpen(false)}
        title="Forecast Guidance Options"
        availableGuidance={availableGuidance}
        initialSelectedColumns={selectedGuidanceCols}
        initialSelectedRows={selectedGuidanceRows}
        onApplyColumns={handleApplyColumns}
        onApplyRows={handleApplyRows}
        viewContext="depletions"
      />
    </Paper>
  );
};
