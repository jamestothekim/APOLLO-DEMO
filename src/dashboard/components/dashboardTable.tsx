import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
} from "@mui/material";
import { ReportConfig } from "../../redux/dashboardSlice";
import { useAppSelector } from "../../redux/store";
import {
  selectRawVolumeData,
  selectVolumeDataStatus,
} from "../../redux/depletionSlice";
import {
  processReportData,
  getUniqueValuesForDimension,
  AVAILABLE_DIMENSIONS,
  ReportDimension,
  AggregationResult,
} from "../../reportBuilder/reportUtil/reportUtil";
import { DashboardOptions } from "./dashboardOptions";
import {
  shouldShowLineChart,
  shouldShowPieChart,
} from "../dashboardUtil/dashboardUtil";
import { DashboardLineChart } from "./DashboardLineChart";
import { DashboardPieChart } from "./DashboardPieChart";

type VizType = "table" | "line" | "pie"; // Define possible visualization types

interface ReportTableProps {
  headers: {
    rows: string[];
    columns: string[];
    valueLabel?: { rows?: string[]; columns?: string[]; value?: string };
  };
  data: (number | null)[][];
  valueFormat?: "number" | "currency" | "string";
}

const formatValue = (
  value: number | null,
  format: ReportTableProps["valueFormat"]
): string => {
  if (value === null || value === undefined) return "-";
  try {
    switch (format) {
      case "currency":
        return value.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        });
      case "number":
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      case "string":
      default:
        return value.toString();
    }
  } catch (e) {
    console.error("Error formatting value:", value, format, e);
    return value.toString();
  }
};

const ReportTable = ({ headers, data, valueFormat }: ReportTableProps) => {
  const isEmptyReport =
    headers &&
    headers.rows.length === 0 &&
    headers.columns.length === 0 &&
    data.length === 1 &&
    data[0].length === 1 &&
    data[0][0] === null;

  if (
    !headers ||
    isEmptyReport ||
    (!headers.rows.length && !headers.columns.length && !data?.[0]?.[0])
  ) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 300,
          width: "100%",
          p: 1,
        }}
      >
        <Typography
          sx={{
            textAlign: "center",
            color: (theme) => theme.palette.primary.main,
          }}
          variant="body2"
        >
          {isEmptyReport
            ? "No data matches the report criteria."
            : "Generate a report by selecting from the options above.  Publish it to add your report to your personal dashboard."}
        </Typography>
      </Box>
    );
  }

  const hasRowHeaders = headers.rows.length > 0;
  const hasColHeaders = headers.columns.length > 0;
  const numCols = hasColHeaders
    ? headers.columns.length
    : hasRowHeaders
    ? 1
    : 0;
  const rowDimensionLabel =
    headers.valueLabel?.rows?.filter(Boolean).join(" / ") ||
    (headers.rows.length ? "Row Value" : "");
  const valueHeaderLabel = headers.valueLabel?.value || "Value";

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      variant="outlined"
      sx={{ height: "100%", overflow: "auto" }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {hasRowHeaders && (
              <TableCell
                sx={{
                  fontWeight: "bold",
                  borderRight: 1,
                  borderColor: "divider",
                  minWidth: 120,
                  position: "sticky",
                  left: 0,
                  background: "white",
                  zIndex: 1,
                }}
              >
                {rowDimensionLabel || ""}
              </TableCell>
            )}
            {hasColHeaders
              ? headers.columns.map((colHeader, index) => (
                  <TableCell
                    key={index}
                    align="right"
                    sx={{ fontWeight: "bold" }}
                  >
                    {colHeader}
                  </TableCell>
                ))
              : hasRowHeaders && (
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {valueHeaderLabel}
                  </TableCell>
                )}
            {!hasRowHeaders && !hasColHeaders && (
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {valueHeaderLabel}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {hasRowHeaders
            ? headers.rows.map((rowHeader, rowIndex) => (
                <TableRow key={`${rowHeader}-${rowIndex}`} hover>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{
                      borderRight: 1,
                      borderColor: "divider",
                      position: "sticky",
                      left: 0,
                      background: "white",
                      zIndex: 1,
                    }}
                  >
                    {rowHeader}
                  </TableCell>
                  {Array.from({ length: numCols }).map((_, colIndex) => (
                    <TableCell key={colIndex} align="right">
                      {formatValue(data?.[rowIndex]?.[colIndex], valueFormat)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : hasColHeaders && (
                <TableRow hover>
                  {Array.from({ length: numCols }).map((_, colIndex) => (
                    <TableCell key={colIndex} align="right">
                      {formatValue(data?.[0]?.[colIndex], valueFormat)}
                    </TableCell>
                  ))}
                </TableRow>
              )}
          {!hasRowHeaders && !hasColHeaders && data?.[0]?.[0] !== undefined && (
            <TableRow hover>
              <TableCell align="right">
                {formatValue(data[0][0], valueFormat)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

interface DashboardTableProps {
  config: ReportConfig;
  onDelete?: () => void;
}

const DIMENSIONS = AVAILABLE_DIMENSIONS.filter((d) => d.type === "dimension");
const MEASURES = AVAILABLE_DIMENSIONS.filter((d) => d.type === "measure");

const findDimension = (id: string | null): ReportDimension | null => {
  if (!id) return null;
  return AVAILABLE_DIMENSIONS.find((d) => d.id === id) || null;
};

export const DashboardTable: React.FC<DashboardTableProps> = ({
  config,
  onDelete,
}) => {
  const rawVolumeData = useAppSelector(selectRawVolumeData);
  const [currentVizType, setCurrentVizType] = useState<VizType>("table"); // Add state for viz type
  const dataStatus = useAppSelector(selectVolumeDataStatus);
  const [dashboardFilterValues, setDashboardFilterValues] = useState<
    ReportConfig["filterValues"]
  >({});

  useEffect(() => {
    setDashboardFilterValues(config.filterValues || {});
  }, [config.filterValues]);

  const aggregationResult = useMemo<AggregationResult>(() => {
    if (dataStatus !== "succeeded" || !config.calcId) {
      return { rows: [], columns: [], data: [[]], valueFormat: "number" };
    }
    const rowDim = findDimension(config.rowDimId);
    const colDim = findDimension(config.colDimId);
    const calcDim = MEASURES.find((m) => m.id === config.calcId);
    if (!calcDim) {
      return { rows: [], columns: [], data: [[]], valueFormat: "number" };
    }
    const filterDims = (config.filterIds || [])
      .map(findDimension)
      .filter((d): d is ReportDimension => !!d);
    const filtersWithValues = filterDims.map((dim) => ({
      ...dim,
      filterValues: dashboardFilterValues[dim.id] || [],
    }));
    try {
      return processReportData(
        rawVolumeData,
        filtersWithValues,
        rowDim ? [rowDim] : [],
        colDim ? [colDim] : [],
        calcDim
      );
    } catch (error) {
      console.error("Error processing dashboard report data:", error);
      return { rows: [], columns: [], data: [[]], valueFormat: "number" };
    }
  }, [
    config.rowDimId,
    config.colDimId,
    config.calcId,
    config.filterIds,
    rawVolumeData,
    dataStatus,
    dashboardFilterValues,
  ]);

  const handleFilterChange = (dimensionId: string, values: string[]) => {
    setDashboardFilterValues((prev) => ({
      ...prev,
      [dimensionId]: values,
    }));
  };

  const handleChipDelete = (filterId: string, valueToDelete: string) => {
    setDashboardFilterValues((prev) => ({
      ...prev,
      [filterId]: (prev[filterId] || []).filter(
        (value) => value !== valueToDelete
      ),
    }));
  };

  const filterDataForRender = useMemo(() => {
    if (dataStatus !== "succeeded" || rawVolumeData.length === 0) return [];
    return (config.filterIds || [])
      .map((filterId) => {
        const dimension = DIMENSIONS.find((d) => d.id === filterId);
        if (!dimension) return null;
        const availableValues = getUniqueValuesForDimension(
          rawVolumeData,
          filterId
        );
        const currentSelection = dashboardFilterValues[filterId] || [];
        return {
          filterId,
          dimension,
          availableValues,
          currentSelection,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [config.filterIds, rawVolumeData, dataStatus, dashboardFilterValues]);

  // Use utility functions to determine chart visibility
  const canShowLineChart = shouldShowLineChart(config, aggregationResult);
  const canShowPieChart = shouldShowPieChart(config, aggregationResult);

  if (dataStatus === "loading") return <CircularProgress sx={{ m: 2 }} />;
  if (dataStatus === "failed")
    return <Typography color="error">Error loading data.</Typography>;
  if (dataStatus !== "succeeded" || rawVolumeData.length === 0)
    return <Typography color="textSecondary">No data available.</Typography>;

  const tableHeaders = {
    rows: aggregationResult.rows,
    columns: aggregationResult.columns,
    valueLabel: {
      rows: config.rowDimId
        ? [findDimension(config.rowDimId)?.label || config.rowDimId]
        : [],
      columns: config.colDimId
        ? [findDimension(config.colDimId)?.label || config.colDimId]
        : [],
      value:
        MEASURES.find((m) => m.id === config.calcId)?.label ||
        config.calcId ||
        "Value",
    },
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderColor: "divider",
      }}
    >
      {/* Combined Filter/Options Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center", // Align items vertically
          gap: 2,
          flexWrap: "wrap",
          px: 0.5,
          pb: 1.5,
          // Conditionally add bottom border and margin if filters exist
          mb: filterDataForRender.length > 0 ? 1.5 : 0.5, // Reduce margin slightly if no filters
          borderBottom: filterDataForRender.length > 0 ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        {/* Conditionally render filters */}
        {filterDataForRender.map(
          ({ filterId, dimension, availableValues, currentSelection }) => (
            <FormControl
              key={filterId}
              size="small"
              sx={{ m: 0, minWidth: 180, maxWidth: 250 }}
            >
              <InputLabel id={`${filterId}-dashboard-label`}>
                {dimension.label}
              </InputLabel>
              <Select
                labelId={`${filterId}-dashboard-label`}
                label={dimension.label}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      width: 250,
                    },
                  },
                }}
                multiple
                value={currentSelection}
                onChange={(e) =>
                  handleFilterChange(filterId, e.target.value as string[])
                }
                input={<OutlinedInput label={dimension.label} size="small" />}
                renderValue={(selected) => (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentSelection.length > 2 ? (
                      <Typography variant="body2" sx={{ pl: 0.5 }}>
                        {currentSelection.length} selected
                      </Typography>
                    ) : (
                      (selected as string[]).map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ borderRadius: "16px" }}
                          onDelete={() => handleChipDelete(filterId, value)}
                          onMouseDown={(event) => event.stopPropagation()}
                        />
                      ))
                    )}
                  </Box>
                )}
              >
                {availableValues.map((val) => (
                  <MenuItem key={val} value={val} dense>
                    {val}
                  </MenuItem>
                ))}
                {availableValues.length === 0 && (
                  <MenuItem disabled>No values found</MenuItem>
                )}
              </Select>
            </FormControl>
          )
        )}

        {/* Spacer pushes options to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Options are always rendered */}
        <DashboardOptions
          onViewAsTable={() => setCurrentVizType("table")}
          canShowLineChart={canShowLineChart}
          canShowPieChart={canShowPieChart}
          onViewAsLine={() => setCurrentVizType("line")}
          onViewAsPie={() => setCurrentVizType("pie")}
          onDelete={onDelete}
          selectedView={currentVizType}
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "hidden", height: "100%" }}>
        {/* Conditionally render the visualization based on state */}
        {currentVizType === "table" && (
          <ReportTable
            headers={tableHeaders}
            data={aggregationResult.data}
            valueFormat={aggregationResult.valueFormat}
          />
        )}
        {currentVizType === "line" && (
          <DashboardLineChart
            aggregationResult={aggregationResult}
            rowDimId={config.rowDimId}
            colDimId={config.colDimId}
          />
        )}
        {currentVizType === "pie" && (
          <DashboardPieChart
            aggregationResult={aggregationResult}
            rowDimId={config.rowDimId}
            colDimId={config.colDimId}
          />
        )}
      </Box>
    </Paper>
  );
};
