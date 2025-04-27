import React, { useState, useEffect, useMemo } from "react";
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
} from "../redux/userSettingsSlice";
import type { Guidance } from "../redux/userSettingsSlice";

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

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [undoHandler, setUndoHandler] = useState<(() => Promise<void>) | null>(
    null
  );
  const [exportHandler, setExportHandler] = useState<(() => void) | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarketChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const selectedValues = typeof value === "string" ? value.split(",") : value;
    setSelectedMarkets(selectedValues);
    console.log("Selected Markets:", selectedValues);
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

  const getCleanCustomerName = (customerData: string | undefined) => {
    if (!customerData) return "";
    const parts = customerData.split(" - ");
    return parts.length > 1 ? parts[1] : customerData;
  };

  const filteredData: (MarketData | CustomerData)[] = useMemo(() => {
    return isCustomerView
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
  }, [isCustomerView, marketData]);

  useEffect(() => {
    setSelectedMarkets([]);
    setSelectedBrands([]);
  }, [isCustomerView, marketData]);

  const isCustomerData = (
    item: MarketData | CustomerData
  ): item is CustomerData => {
    return "raw" in item;
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

  const handleViewToggle = () => {
    setIsCustomerView(!isCustomerView);
    setSelectedMarkets([]);
    setSelectedBrands([]);
  };

  // Get selected Guidance objects directly from Redux using the reselect selectors
  const selectedGuidanceCols: Guidance[] = useSelector(
    selectPendingGuidanceForecastColumns
  );
  const selectedGuidanceRows: Guidance[] = useSelector(
    selectPendingGuidanceForecastRows
  );

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
                      label={`Filter ${
                        isCustomerView ? "Customers" : "Markets"
                      }`}
                    />
                  }
                  renderValue={(selected) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: 0.5,
                        overflow: "hidden",
                        alignItems: "center",
                        minHeight: "24px",
                      }}
                    >
                      {selected.slice(0, MAX_CHIPS_VISIBLE).map((value) => {
                        const item = filteredData.find(
                          (item) =>
                            (isCustomerData(item)
                              ? item.code
                              : item.market_id) === value
                        );
                        const label = item
                          ? isCustomerData(item)
                            ? item.display
                            : item.market_name
                          : value;
                        return (
                          <Chip
                            key={value}
                            label={label}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              borderRadius: "16px",
                              backgroundColor: "transparent",
                              flexShrink: 0,
                              "& .MuiChip-label": { px: 1 },
                            }}
                            onDelete={(e) => {
                              e.stopPropagation();
                              setSelectedMarkets((prev) =>
                                prev.filter((market) => market !== value)
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      })}
                      {selected.length > MAX_CHIPS_VISIBLE && (
                        <Typography
                          variant="body2"
                          sx={{ pl: 0.5, flexShrink: 0 }}
                        >
                          +{selected.length - MAX_CHIPS_VISIBLE} more
                        </Typography>
                      )}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {},
                      },
                    },
                  }}
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
                  input={<OutlinedInput label="Filter Brands" />}
                  renderValue={(selected) => (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: 0.5,
                        overflow: "hidden",
                        alignItems: "center",
                        minHeight: "24px",
                      }}
                    >
                      {selected.slice(0, MAX_CHIPS_VISIBLE).map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: "16px",
                            backgroundColor: "transparent",
                            flexShrink: 0,
                            "& .MuiChip-label": { px: 1 },
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            setSelectedBrands((prev) =>
                              prev.filter((brand) => brand !== value)
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ))}
                      {selected.length > MAX_CHIPS_VISIBLE && (
                        <Typography
                          variant="body2"
                          sx={{ pl: 0.5, flexShrink: 0 }}
                        >
                          +{selected.length - MAX_CHIPS_VISIBLE} more
                        </Typography>
                      )}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {},
                      },
                    },
                  }}
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
      />
    </Paper>
  );
};
