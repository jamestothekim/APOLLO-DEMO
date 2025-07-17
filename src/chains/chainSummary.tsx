import React, { useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  Collapse,
  Chip,
  TextField,
  Autocomplete,
} from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ChainToolbox } from "./chainComponents/chainToolbox";
import { exportSummaryCsv, SummaryLikeRow } from "./chainUtil/chainUtil";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { RootState } from "../redux/store";
import {
  selectFilteredChainData,
  selectChainFilters,
  setFilters,
  ChainForecastData,
} from "../redux/slices/chainSlice";
import { useDispatch } from "react-redux";

// Interfaces for aggregated summary data
interface ChainSummaryData {
  id: string;
  market: string;
  chain?: string;
  brand?: string;
  months: { [key: string]: number };
  total: number;
  level: 0 | 1 | 2; // 0=Market, 1=Chain, 2=Brand
  isParent: boolean;
  parentId?: string;
}

// Month names for display
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

const MAX_CHIPS_VISIBLE = 3;

export const ChainSummary: React.FC = () => {
  const dispatch = useDispatch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const theme = useTheme();

  // Redux state
  const chainData = useSelector((state: RootState) =>
    selectFilteredChainData(state)
  );
  const filters = useSelector((state: RootState) => selectChainFilters(state));

  // Local state for filters
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    filters.selectedMarkets
  );
  const [selectedChains, setSelectedChains] = useState<string[]>(
    filters.selectedChains
  );

  // Expanded state management
  const [expandedMarketIds, setExpandedMarketIds] = useState<Set<string>>(
    new Set()
  );
  const [expandedChainIds, setExpandedChainIds] = useState<Set<string>>(
    new Set()
  );

  // Calculate lastActualMonthIndex based on data
  const lastActualMonthIndex = useMemo(() => {
    let maxActualIndex = -1;

    chainData.forEach((row) => {
      MONTH_NAMES.forEach((month, index) => {
        if (row.months[month]?.isActual) {
          maxActualIndex = Math.max(maxActualIndex, index);
        }
      });
    });

    return maxActualIndex;
  }, [chainData]);

  // Extract product names (brands) from chain data
  const extractBrand = (product: string): string => {
    // Extract brand from product string (before " - ")
    const dashIndex = product.indexOf(" - ");
    return dashIndex !== -1 ? product.slice(0, dashIndex) : product;
  };

  // Build filter options
  const marketOptions = Array.from(
    new Set(chainData.map((d) => d.market))
  ).sort();
  const chainOptions = Array.from(
    new Set(chainData.map((d) => d.chain))
  ).sort();

  // Update Redux filters when local filters change
  React.useEffect(() => {
    dispatch(
      setFilters({
        selectedMarkets,
        selectedChains,
      })
    );
  }, [selectedMarkets, selectedChains, dispatch]);

  // Handle expand/collapse
  const handleMarketExpandClick = useCallback(
    (marketId: string) => {
      setExpandedMarketIds((prev) => {
        const newIds = new Set(prev);
        if (newIds.has(marketId)) {
          newIds.delete(marketId);
          // Also collapse all chains under this market
          setExpandedChainIds((prevChains) => {
            const newChainIds = new Set(prevChains);
            chainData
              .filter((d) => d.market === marketId)
              .forEach((d) => newChainIds.delete(`${marketId}_${d.chain}`));
            return newChainIds;
          });
        } else {
          newIds.add(marketId);
        }
        return newIds;
      });
    },
    [chainData]
  );

  const handleChainExpandClick = useCallback((chainId: string) => {
    setExpandedChainIds((prev) => {
      const newIds = new Set(prev);
      if (newIds.has(chainId)) {
        newIds.delete(chainId);
      } else {
        newIds.add(chainId);
      }
      return newIds;
    });
  }, []);

  // Aggregate chain data into summary format
  const summaryData = useMemo((): ChainSummaryData[] => {
    const rows: ChainSummaryData[] = [];

    // Group by market
    const marketGroups = chainData.reduce((acc, item) => {
      if (!acc[item.market]) acc[item.market] = [];
      acc[item.market].push(item);
      return acc;
    }, {} as { [key: string]: ChainForecastData[] });

    Object.entries(marketGroups).forEach(([market, marketItems]) => {
      // Calculate market totals
      const marketMonths: { [key: string]: number } = {};
      MONTH_NAMES.forEach((month) => {
        marketMonths[month] = marketItems.reduce(
          (sum, item) => sum + (item.months[month]?.value || 0),
          0
        );
      });
      const marketTotal = Object.values(marketMonths).reduce(
        (sum, val) => sum + val,
        0
      );

      // Market row
      const marketRow: ChainSummaryData = {
        id: `market:${market}`,
        market,
        months: marketMonths,
        total: marketTotal,
        level: 0,
        isParent: true,
      };
      rows.push(marketRow);

      // If market is expanded, show chains
      if (expandedMarketIds.has(market)) {
        // Group by chain within market
        const chainGroups = marketItems.reduce((acc, item) => {
          if (!acc[item.chain]) acc[item.chain] = [];
          acc[item.chain].push(item);
          return acc;
        }, {} as { [key: string]: ChainForecastData[] });

        Object.entries(chainGroups).forEach(([chain, chainItems]) => {
          // Calculate chain totals
          const chainMonths: { [key: string]: number } = {};
          MONTH_NAMES.forEach((month) => {
            chainMonths[month] = chainItems.reduce(
              (sum, item) => sum + (item.months[month]?.value || 0),
              0
            );
          });
          const chainTotal = Object.values(chainMonths).reduce(
            (sum, val) => sum + val,
            0
          );

          // Chain row
          const chainRowId = `${market}_${chain}`;
          const chainRow: ChainSummaryData = {
            id: `chain:${chainRowId}`,
            market,
            chain,
            months: chainMonths,
            total: chainTotal,
            level: 1,
            isParent: true,
            parentId: market,
          };
          rows.push(chainRow);

          // If chain is expanded, show brands
          if (expandedChainIds.has(chainRowId)) {
            // Group by brand within chain
            const brandGroups = chainItems.reduce((acc, item) => {
              const brand = extractBrand(item.product);
              if (!acc[brand]) acc[brand] = [];
              acc[brand].push(item);
              return acc;
            }, {} as { [key: string]: ChainForecastData[] });

            Object.entries(brandGroups).forEach(([brand, brandItems]) => {
              // Calculate brand totals
              const brandMonths: { [key: string]: number } = {};
              MONTH_NAMES.forEach((month) => {
                brandMonths[month] = brandItems.reduce(
                  (sum, item) => sum + (item.months[month]?.value || 0),
                  0
                );
              });
              const brandTotal = Object.values(brandMonths).reduce(
                (sum, val) => sum + val,
                0
              );

              // Brand row
              const brandRow: ChainSummaryData = {
                id: `brand:${market}_${chain}_${brand}`,
                market,
                chain,
                brand,
                months: brandMonths,
                total: brandTotal,
                level: 2,
                isParent: false,
                parentId: chainRowId,
              };
              rows.push(brandRow);
            });
          }
        });
      }
    });

    // Add total row at the end
    if (rows.length > 0) {
      const totalMonths: { [key: string]: number } = {};
      MONTH_NAMES.forEach((month) => {
        totalMonths[month] = rows.reduce(
          (sum, row) => sum + (row.months[month] || 0),
          0
        );
      });
      const totalTotal = Object.values(totalMonths).reduce(
        (sum, val) => sum + val,
        0
      );

      const totalRow: ChainSummaryData = {
        id: "total-row",
        market: "Total Chains",
        months: totalMonths,
        total: totalTotal,
        level: 0,
        isParent: false,
      };
      rows.push(totalRow);
    }

    return rows.filter((row) => Math.abs(row.total) > 0.001);
  }, [chainData, expandedMarketIds, expandedChainIds]);

  // Define columns
  const columns: Column[] = useMemo(() => {
    const nameColumn: Column = {
      key: "name",
      header: "Name",
      sortable: true,
      sx: { minWidth: 200 },
      render: (_value: any, row: ChainSummaryData) => {
        const isExpanded =
          row.level === 0
            ? expandedMarketIds.has(row.market)
            : row.level === 1
            ? expandedChainIds.has(`${row.market}_${row.chain}`)
            : false;

        const handleClick = () => {
          if (row.level === 0) {
            handleMarketExpandClick(row.market);
          } else if (row.level === 1 && row.chain) {
            handleChainExpandClick(`${row.market}_${row.chain}`);
          }
        };

        const name =
          row.level === 0
            ? row.market
            : row.level === 1
            ? row.chain
            : row.brand;

        return (
          <Box
            sx={{ display: "flex", alignItems: "center", pl: row.level * 2 }}
          >
            {row.isParent && (
              <IconButton size="small" onClick={handleClick} sx={{ mr: 0.5 }}>
                {isExpanded ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            )}
            <Typography variant="body2">{name}</Typography>
          </Box>
        );
      },
    };

    const totalColumn: Column = {
      key: "total",
      header: "Total",
      subHeader: "FY (9L)",
      align: "right",
      sortable: true,
      sx: { minWidth: 120, borderRight: "1px solid rgba(224, 224, 224, 1)" },
      render: (_value: any, row: ChainSummaryData) => {
        return row.total.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      },
    };

    const monthColumns: Column[] = MONTH_NAMES.map((month, index) => ({
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
      align: "right",
      sortable: true,
      sx: { minWidth: 80 },
      render: (_value: any, row: ChainSummaryData) => {
        const value = row.months[month] || 0;

        return value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      },
    }));

    return [nameColumn, totalColumn, ...monthColumns];
  }, [
    theme,
    lastActualMonthIndex,
    expandedMarketIds,
    expandedChainIds,
    handleMarketExpandClick,
    handleChainExpandClick,
  ]);

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
            CHAIN SUMMARY
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
        {/* right side empty spacing */}
      </Box>

      <Collapse in={!isCollapsed}>
        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Autocomplete
            multiple
            limitTags={MAX_CHIPS_VISIBLE}
            options={marketOptions}
            value={selectedMarkets}
            onChange={(_, newValue) => setSelectedMarkets(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Filter Markets" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Autocomplete
            multiple
            limitTags={MAX_CHIPS_VISIBLE}
            options={chainOptions}
            value={selectedChains}
            onChange={(_, newValue) => setSelectedChains(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Filter Chains" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 200 }}
          />
        </Box>

        {/* Toolbox */}
        <Box sx={{ mb: 1 }}>
          <ChainToolbox
            onUndo={() => console.log("Summary undo")}
            onGuidance={() => console.log("Summary guidance")}
            onExport={() => exportSummaryCsv(summaryData as SummaryLikeRow[])}
            canUndo={false}
          />
        </Box>

        {/* Summary Table */}
        <DynamicTable
          data={summaryData}
          columns={columns}
          stickyHeader={true}
          maxHeight="calc(100vh - 300px)"
          defaultRowsPerPage={25}
          rowsPerPageOptions={[10, 25, 50, { value: -1, label: "All" }]}
          getRowId={(row: ChainSummaryData) => row.id}
          isNested={true}
        />
      </Collapse>
    </Paper>
  );
};

export default ChainSummary;
