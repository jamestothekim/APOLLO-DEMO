import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Chip,
  Button,
  useTheme,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/Publish";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { exportPlannerCsv } from "./chainUtil/chainUtil";
import { ChainToolbox } from "./chainComponents/chainToolbox";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import {
  FORECAST_OPTIONS,
  type ForecastLogic,
} from "../volume/util/volumeUtil";
import { RootState } from "../redux/store";
import {
  fetchChainData,
  updateChainForecastLogic,
  setFilters,
  updateForecastLogicOptimistic,
  clearError,
  selectFilteredChainData,
  selectChainFilters,
  selectChainLoading,
  selectChainError,
  selectMarketOptions,
  selectChainOptions,
  selectProductOptions,
  ChainForecastData,
} from "../redux/slices/chainSlice";
import { ChainSidebar } from "./chainSidebar";
import { ChainDetails } from "./details/chainDetails";

// Month names for columns
const MONTH_NAMES = [
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

// Calculate total from monthly values
const calculateTotal = (months: ChainForecastData["months"]): number => {
  return Object.values(months).reduce((sum, month) => sum + month.value, 0);
};

export const ChainPlanner: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();

  // Redux state
  const filteredData = useSelector((state: RootState) =>
    selectFilteredChainData(state)
  );
  const filters = useSelector((state: RootState) => selectChainFilters(state));
  const loading = useSelector((state: RootState) => selectChainLoading(state));
  const error = useSelector((state: RootState) => selectChainError(state));
  const marketOptions = useSelector((state: RootState) =>
    selectMarketOptions(state)
  );
  const chainOptions = useSelector((state: RootState) =>
    selectChainOptions(state)
  );
  const productOptions = useSelector((state: RootState) =>
    selectProductOptions(state)
  );

  // Local component state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [chainDetailsOpen, setChainDetailsOpen] = useState(false);
  const [selectedChainForDetails, setSelectedChainForDetails] = useState<{
    chainName: string;
    market: string;
  } | null>(null);

  // Calculate lastActualMonthIndex based on data
  const lastActualMonthIndex = useMemo(() => {
    let maxActualIndex = -1;

    filteredData.forEach((row) => {
      MONTH_NAMES.forEach((month, index) => {
        if (row.months[month]?.isActual) {
          maxActualIndex = Math.max(maxActualIndex, index);
        }
      });
    });

    return maxActualIndex;
  }, [filteredData]);

  // Extract filters for convenience
  const { selectedMarkets, selectedChains, selectedProducts } = filters;

  // Fetch data on component mount
  useEffect(() => {
    // Redux Toolkit thunk requires type assertion for dispatch
    dispatch(fetchChainData() as any);
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [dispatch, error]);

  // Handle forecast logic change
  const handleLogicChange = (
    event: SelectChangeEvent<string>,
    rowId: string
  ) => {
    event.stopPropagation();
    const newLogic = event.target.value as ForecastLogic;

    // Optimistic update
    dispatch(
      updateForecastLogicOptimistic({ id: rowId, forecastLogic: newLogic })
    );

    // Async update (this will be replaced with real API call)
    // Redux Toolkit thunk requires type assertion for dispatch
    dispatch(
      updateChainForecastLogic({ id: rowId, forecastLogic: newLogic }) as any
    );

    console.log(`Changed forecast logic for ${rowId} to ${newLogic}`);
  };

  // Handle chain details click
  const handleChainDetailsClick = (chainName: string, market: string) => {
    setSelectedChainForDetails({ chainName, market });
    setChainDetailsOpen(true);
  };

  const handleCloseChainDetails = () => {
    setChainDetailsOpen(false);
    setSelectedChainForDetails(null);
  };

  // Column definitions - matching chainsProto spec
  const columns: Column[] = useMemo(() => {
    const cellPaddingSx = { py: "6px", px: "16px" };

    return [
      {
        key: "market",
        header: "Market",
        sortable: true,
        filterable: true,
        sx: { ...cellPaddingSx, minWidth: 120 },
        getValue: (row: ChainForecastData) => row.market,
      },
      {
        key: "chain",
        header: "Chain",
        sortable: true,
        filterable: true,
        sx: { ...cellPaddingSx, minWidth: 140 },
        getValue: (row: ChainForecastData) => row.chain,
      },
      {
        key: "product",
        header: "Product",
        sortable: true,
        filterable: true,
        extraWide: true,
        sx: { ...cellPaddingSx, minWidth: 200 },
        getValue: (row: ChainForecastData) => row.product,
      },
      {
        key: "forecastLogic",
        header: "LOGIC",
        align: "left" as const,
        sortable: false,
        sx: {
          ...cellPaddingSx,
          borderRight: "1px solid rgba(224, 224, 224, 1)",
          minWidth: 130,
        },
        render: (value: string, row: ChainForecastData) => {
          const isLocked = row.status === "review" || row.status === "approved";
          return (
            <Select
              value={value}
              onChange={(e) => handleLogicChange(e, row.id)}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{ fontSize: "inherit", minWidth: 130 }}
              disabled={isLocked}
            >
              {FORECAST_OPTIONS.map((option) => (
                <MenuItem key={option.id} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          );
        },
      },
      {
        key: "tyVol",
        header: "TY Vol",
        subHeader: "FY (9L)",
        align: "right" as const,
        sortable: true,
        sx: {
          ...cellPaddingSx,
          minWidth: 100,
          borderRight: "1px solid rgba(224, 224, 224, 1)",
        },
        sortAccessor: (row: ChainForecastData) => calculateTotal(row.months),
        render: (_: unknown, row: ChainForecastData) => {
          const total = calculateTotal(row.months);
          return total.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
        },
      },
      // Monthly columns with ACT/PROJ/FCST subheaders
      ...MONTH_NAMES.map((month, index) => ({
        key: `months.${month}`,
        header: month,
        subHeader:
          index <= lastActualMonthIndex ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "100%",
              }}
            >
              <Box
                component="span"
                sx={{ flexGrow: 1, textAlign: "center", fontStyle: "italic" }}
              >
                ACT
              </Box>
              <CheckCircleIcon
                fontSize="inherit"
                color="primary"
                sx={{
                  fontSize: "1.0em",
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </Box>
          ) : index === lastActualMonthIndex + 1 ? (
            "PROJ"
          ) : (
            "FCST"
          ),
        align: "right" as const,
        sortable: true,
        sx: { ...cellPaddingSx, minWidth: 80 },
        sortAccessor: (row: ChainForecastData) => row.months[month]?.value || 0,
        render: (_: unknown, row: ChainForecastData) => {
          const monthData = row.months[month];
          if (!monthData) return "-";

          const isActualOrProjected = index <= lastActualMonthIndex + 1;
          const isClickable = index <= lastActualMonthIndex + 1; // Only actual and projected are clickable

          return (
            <Box sx={{ position: "relative" }}>
              <Box
                component="span"
                sx={{
                  color: isActualOrProjected
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                  cursor: isClickable ? "pointer" : "default",
                  "&:hover": isClickable
                    ? {
                        backgroundColor: "rgba(25, 118, 210, 0.08)",
                      }
                    : {},
                  px: 0.5,
                  borderRadius: "4px",
                  transition: "background-color 0.2s",
                }}
                onClick={
                  isClickable
                    ? (e) => {
                        e.stopPropagation();
                        handleChainDetailsClick(row.chain, row.market);
                      }
                    : undefined
                }
                title={
                  isClickable
                    ? `Click to view ${row.chain} details in ${row.market}`
                    : undefined
                }
              >
                {monthData.value.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </Box>
              {monthData.isManuallyModified && (
                <EditIcon
                  sx={{
                    fontSize: "0.875rem",
                    position: "absolute",
                    right: "-16px", // Position relative to number
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "secondary.main",
                    opacity: 0.7,
                  }}
                />
              )}
            </Box>
          );
        },
      })),
      // Comments column
      {
        key: "comments",
        header: "💬",
        align: "center" as const,
        sx: cellPaddingSx,
        render: (comments: string) => {
          return (
            <Box
              sx={{
                cursor: comments ? "pointer" : "default",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "24px",
              }}
            >
              {comments ? "💬" : ""}
            </Box>
          );
        },
      },
    ];
  }, [theme, lastActualMonthIndex]);

  const handleRowClick = (row: ChainForecastData) => {
    console.log("Row clicked:", row);
    setSelectedChainId(row.id);
    setSidebarOpen(true);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: theme.palette.primary.main,
              mr: 1,
            }}
          >
            CHAIN PLANNER
          </Typography>
          <Tooltip title={isCollapsed ? "Expand" : "Collapse"}>
            <IconButton onClick={() => setIsCollapsed((v) => !v)} size="small">
              {isCollapsed ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowUpIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Add Chain Forecast removed - budget mode out of scope */}
        </Box>
      </Box>

      {/* Filters */}
      {!isCollapsed && (
        <Box sx={{ display: "flex", gap: 2, mb: 2, width: "100%" }}>
          <Autocomplete
            multiple
            limitTags={2}
            options={marketOptions}
            value={selectedMarkets}
            onChange={(_, v) => dispatch(setFilters({ selectedMarkets: v }))}
            renderInput={(params) => (
              <TextField {...params} label="Filter Markets" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Autocomplete
            multiple
            limitTags={2}
            options={chainOptions}
            value={selectedChains}
            onChange={(_, v) => dispatch(setFilters({ selectedChains: v }))}
            renderInput={(params) => (
              <TextField {...params} label="Filter Chains" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Autocomplete
            multiple
            limitTags={2}
            options={productOptions}
            value={selectedProducts}
            onChange={(_, v) => dispatch(setFilters({ selectedProducts: v }))}
            renderInput={(params) => (
              <TextField {...params} label="Filter Products" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
        </Box>
      )}

      {/* Toolbox under filters */}
      {!isCollapsed && (
        <Box sx={{ mb: 1 }}>
          <ChainToolbox
            onUndo={() => console.log("Undo clicked")}
            onGuidance={() => console.log("Guidance clicked")}
            onExport={() => exportPlannerCsv(filteredData)}
            canUndo={false}
          />
        </Box>
      )}

      {/* Table */}
      {!isCollapsed && (
        <DynamicTable
          data={filteredData}
          columns={columns}
          onRowClick={handleRowClick}
          stickyHeader
          enableColumnFiltering={true}
          maxHeight="calc(100vh - 300px)"
          defaultRowsPerPage={10}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}

      {/* Action Buttons */}
      {!isCollapsed && (
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => console.log("Save clicked")}
          >
            <SaveIcon sx={{ mr: 1 }} />
            Save Progress
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => console.log("Publish clicked")}
          >
            <PublishIcon sx={{ mr: 1 }} />
            Publish
          </Button>
        </Box>
      )}

      {/* Chain Sidebar */}
      <ChainSidebar
        open={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          setSelectedChainId(null);
        }}
        chainId={selectedChainId}
      />

      {/* Chain Details Modal */}
      {chainDetailsOpen && selectedChainForDetails && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: theme.zIndex.modal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleCloseChainDetails}
        >
          <Box
            sx={{
              backgroundColor: "background.paper",
              width: "1152px", // Standard md width (960px) + 20%
              maxWidth: "90vw",
              height: "80vh", // Reduced from 90vh to 80vh for better proportions
              maxHeight: "900px", // Added max height constraint
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChainDetails
              chainName={selectedChainForDetails.chainName}
              market={selectedChainForDetails.market}
              onClose={handleCloseChainDetails}
            />
          </Box>
        </Box>
      )}

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => dispatch(clearError())}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => dispatch(clearError())}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ChainPlanner;
