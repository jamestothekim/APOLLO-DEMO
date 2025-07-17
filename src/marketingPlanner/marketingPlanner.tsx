import React, { useMemo } from "react";
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CommentIcon from "@mui/icons-material/Comment";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/Publish";
import {
  MARKETS,
  PROGRAMS,
  MarketingProgram,
  BRANDS,
} from "./marketingPlayData/marketingData";
import MarketingSidebar from "./marketingComponents/marketingSidebar";
import { calculateMonthlyTotals } from "./marketingCalculations/marketingPlannerCalculations";
import { DynamicTable, Column } from "../reusableComponents/dynamicTable";
import MarketingFilters from "./marketingComponents/marketingFilters";
import MarketingToolbox from "./marketingComponents/marketingToolbox";
import { useSelector, useDispatch } from "react-redux";
import {
  selectPrograms,
  selectFilters,
  addProgram,
  updateProgram,
  setFilters,
} from "../redux/slices/marketingSlice";
import { exportMarketingToCSV } from "./marketingPlayData/exportUtil";

export const MarketingPlanner: React.FC = () => {
  const dispatch = useDispatch();
  const programs = useSelector(selectPrograms);
  const filters = useSelector(selectFilters);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<MarketingProgram | null>(
    null
  );
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Handlers for filters
  const handleMarketChange = (markets: number[]) => {
    dispatch(setFilters({ ...filters, markets }));
  };
  const handleBrandChange = (brands: number[]) => {
    dispatch(setFilters({ ...filters, brands }));
  };
  // handleTagChange removed - tags filtering not implemented yet

  // Add and update program handlers
  const handleAddProgram = (newProgram: MarketingProgram) => {
    dispatch(addProgram({ ...newProgram, id: programs.length + 1 }));
    setIsSidebarOpen(false);
  };
  const handleSidebarSave = (updatedProgram: MarketingProgram) => {
    dispatch(updateProgram(updatedProgram));
    setSelectedRow(null);
    setIsSidebarOpen(false);
  };

  const getMarketName = (marketId: number) => {
    return MARKETS.find((m) => m.id === marketId)?.name || "";
  };
  const getProgramName = (programId: number) => {
    return PROGRAMS.find((p) => p.id === programId)?.program_name || "";
  };
  const getBrandName = (brandId: number | string) => {
    return BRANDS.find((b) => b.id === Number(brandId))?.name || "";
  };

  const handleRowClick = (row: MarketingProgram) => {
    if (row.id === -1) return; // Don't allow editing of totals row
    setSelectedRow(row);
    setIsSidebarOpen(true);
  };

  // Filter programs based on selected markets and brands
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const marketMatch =
        filters.markets.length === 0 ||
        filters.markets.includes(program.market);
      const brandMatch =
        filters.brands.length === 0 || filters.brands.includes(program.brand);
      return marketMatch && brandMatch;
    });
  }, [programs, filters.markets, filters.brands]);

  const monthlyTotals = calculateMonthlyTotals(filteredPrograms);
  const grandTotal = Object.values(monthlyTotals).reduce(
    (sum, val) => sum + val,
    0
  );

  const columns: Column[] = [
    {
      key: "market",
      header: "MARKET",
      render: (_: any, row: MarketingProgram) => getMarketName(row.market),
    },
    {
      key: "brand",
      header: "BRAND",
      render: (_: any, row: MarketingProgram) => getBrandName(row.brand),
    },
    {
      key: "program",
      header: "PROGRAM",
      render: (_: any, row: MarketingProgram) => getProgramName(row.program),
    },
    {
      key: "total_ty",
      header: "TOTAL TY",
      align: "right",
      render: (_: any, row: MarketingProgram) =>
        `$${row.total_ty.toLocaleString()}`,
    },
    ...[
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
    ].map((month) => ({
      key: `months.${month}`,
      header: month.toUpperCase(),
      align: "right" as const,
      render: (_: any, row: MarketingProgram) =>
        `$${(row.months[month] || 0).toLocaleString()}`,
    })),
    {
      key: "notes",
      header: <CommentIcon fontSize="small" />,
      align: "center",
      render: (_: any, row: MarketingProgram) =>
        row.notes ? (
          <Tooltip title={row.notes} placement="top">
            <IconButton size="small" color="primary">
              <CommentIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ];

  // Add a totals row at the bottom
  const dataWithTotal = [
    ...filteredPrograms,
    {
      id: -1,
      market: 0,
      brand: 0,
      program: 0,
      total_ty: grandTotal,
      months: { ...monthlyTotals },
      notes: "",
    } as MarketingProgram,
  ];

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: (theme) => theme.palette.primary.main,
            }}
          >
            MARKETING PLANNER
          </Typography>
          <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedRow(null);
            setIsSidebarOpen(true);
          }}
          sx={{ minWidth: 150 }}
        >
          Add Program
        </Button>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <MarketingFilters
          selectedMarkets={filters.markets}
          selectedBrands={filters.brands}
          onMarketChange={handleMarketChange}
          onBrandChange={handleBrandChange}
        />
        <Box sx={{ mb: 1 }}>
          <MarketingToolbox
            onExport={() => exportMarketingToCSV(filteredPrograms)}
          />
        </Box>
        <DynamicTable
          data={dataWithTotal}
          columns={columns}
          showPagination={false}
          stickyHeader={true}
          maxHeight="70vh"
          getRowId={(row) => String(row.id)}
          rowTooltipContent={(row) =>
            row.id === -1 ? "Totals" : "Click to edit"
          }
          enableRowTooltip={true}
          onRowClick={handleRowClick}
        />
      </Box>

      <MarketingSidebar
        key={selectedRow ? selectedRow.id : "new"}
        open={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
          setSelectedRow(null);
        }}
        onSave={selectedRow ? handleSidebarSave : handleAddProgram}
        initialData={selectedRow}
        editMode={!!selectedRow}
      />

      {/* Save and Publish Buttons */}
      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => console.log("Save clicked")}
          startIcon={<SaveIcon />}
        >
          Save Progress
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => console.log("Publish clicked")}
          startIcon={<PublishIcon />}
        >
          Publish
        </Button>
      </Box>
    </Paper>
  );
};

export default MarketingPlanner;
