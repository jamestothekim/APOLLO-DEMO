import React from "react";
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Chip,
} from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { SCAN_MARKETS } from "./scanPlayData/scanData";
import { useAppSelector, useAppDispatch } from "../redux/store";
import { setMode } from "../redux/slices/scanSlice";
import { aggregatePlannerRows } from "./scanCalculations/scanSummaryCalculations";
import { createSelector } from "@reduxjs/toolkit";

/**
 * Temporary placeholder for Scan Summary.
 * Displays a simple card until real implementation is built.
 */
export const ScanSummary: React.FC = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.scan.mode);
  const summarySelector = React.useMemo(
    () =>
      createSelector(
        (state: any) => state.scan.plannerRows,
        aggregatePlannerRows
      ),
    []
  );

  const summaryRows = useAppSelector(summarySelector);

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  /* Filters */
  const [selectedMarkets, setSelectedMarkets] = React.useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = React.useState<string[]>([]);

  const marketOptions = SCAN_MARKETS.map((m: any) => m.name);
  const brandOptions = Array.from(new Set(summaryRows.map((r) => r.brand)));

  /* Columns */
  const columns: Column[] = [
    {
      key: "market",
      header: "Market",
      sortable: true,
      render: (v: string) => {
        const m = SCAN_MARKETS.find((mk: any) => mk.name === v);
        return m ? m.abbr : v;
      },
    },
    { key: "brand", header: "Brand", sortable: true },
    {
      key: "tyBud",
      header: "Total Projected ($)",
      subHeader: "BUD",
      align: "right",
      render: (_: any, row: any) =>
        (row.tyBud ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    ...([
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ].map((m) => ({
      key: m,
      header: m.toUpperCase(),
      subHeader: "BUD",
      align: "right" as const,
      render: (_: any, row: any) =>
        (row.months?.[m] ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    })) as Column[]),
  ];

  const handleChange = (e: any) => {
    dispatch(setMode(e.target.value as "budget" | "forecast"));
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            color: (theme) => theme.palette.primary.main,
            mr: 1,
          }}
        >
          SCAN SUMMARY
        </Typography>
        <Tooltip title={isCollapsed ? "Expand" : "Collapse"}>
          <IconButton onClick={() => setIsCollapsed((v) => !v)} size="small">
            {isCollapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }} />

        <FormControl size="small" variant="outlined" sx={{ minWidth: 200 }}>
          <InputLabel id="version-label">Version</InputLabel>
          <Select
            labelId="version-label"
            label="Version"
            value={mode}
            onChange={handleChange}
          >
            <MenuItem value="budget">Budget</MenuItem>
            <MenuItem value="forecast">Forecast</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!isCollapsed && (
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Autocomplete
            multiple
            limitTags={2}
            options={marketOptions}
            value={selectedMarkets}
            onChange={(_e, v) => setSelectedMarkets(v)}
            renderInput={(p) => <TextField {...p} label="Filter Markets" />}
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
            options={brandOptions}
            value={selectedBrands}
            onChange={(_e, v) => setSelectedBrands(v)}
            renderInput={(p) => <TextField {...p} label="Filter Brands" />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            }
            sx={{ flex: 1, minWidth: 180 }}
          />
        </Box>
      )}

      {!isCollapsed && (
        <DynamicTable
          data={summaryRows}
          columns={columns}
          stickyHeader
          enableColumnFiltering={false}
          maxHeight="calc(100vh - 400px)"
          defaultRowsPerPage={10}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}
    </Paper>
  );
};

export default ScanSummary;
