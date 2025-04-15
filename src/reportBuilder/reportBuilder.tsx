import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  AVAILABLE_DIMENSIONS,
  processReportData,
  AggregationResult,
  ReportDimension,
  getUniqueValuesForDimension,
  exportReportToCSV,
} from "./reportUtil/reportUtil";
import { Toolbox } from "../volume/components/toolbox";
import { useState, useEffect } from "react";
// --- Redux Imports --- START
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import {
  selectRawVolumeData,
  selectVolumeDataStatus,
  selectVolumeDataError,
} from "../redux/depletionSlice";
// --- Redux Imports --- END

// --- Report Table Component ---
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
        }); // Assuming USD
      case "number":
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 }); // Round numbers
      case "string":
      default:
        return value.toString();
    }
  } catch (e) {
    console.error("Error formatting value:", value, format, e);
    return value.toString(); // Fallback
  }
};

const ReportTable = ({ headers, data, valueFormat }: ReportTableProps) => {
  if (!headers || (!headers.rows.length && !headers.columns.length)) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 150,
          width: "100%",
          p: 2,
        }}
      >
        <Typography sx={{ textAlign: "center", color: "primary.main" }}>
          Select dimensions for Rows, Columns, and a Calculation to build the
          report.
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
    <TableContainer component={Paper} elevation={0} variant="outlined">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {hasRowHeaders && (
              <TableCell
                sx={{
                  fontWeight: "bold",
                  borderRight: 1,
                  borderColor: "divider",
                  minWidth: 150,
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
            {!hasRowHeaders && hasColHeaders && (
              <TableCell sx={{ minWidth: 150 }} />
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
                  <TableCell sx={{ minWidth: 150 }} />
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

// Separate dimensions and measures for easier use in Selects
const DIMENSIONS = AVAILABLE_DIMENSIONS.filter((d) => d.type === "dimension");
const MEASURES = AVAILABLE_DIMENSIONS.filter((d) => d.type === "measure");

// --- Type for filter values state ---
interface SelectedFilterValues {
  [dimensionId: string]: string[]; // e.g., { brand: ["Balvenie"], market: ["USAFL1"] }
}

// --- Type for Snackbar state ---
interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
}

const ReportBuilder = () => {
  const theme = useTheme();
  const [aggregationResult, setAggregationResult] = useState<AggregationResult>(
    {
      rows: [],
      columns: [],
      data: [[]],
      valueFormat: "number",
    }
  );

  // --- State for single selection ---
  const [selectedRow, setSelectedRow] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  // Keep Filters multi-select
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedCalculation, setSelectedCalculation] = useState<string>("");
  // --- State for selected filter values ---
  const [selectedFilterValues, setSelectedFilterValues] =
    useState<SelectedFilterValues>({});
  // --------------------------------------
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });

  // --- Get Data from Redux --- START
  const rawVolumeData = useSelector((state: RootState) =>
    selectRawVolumeData(state)
  );
  const depletionsStatus = useSelector((state: RootState) =>
    selectVolumeDataStatus(state)
  );
  const depletionsError = useSelector((state: RootState) =>
    selectVolumeDataError(state)
  );
  // --- Get Data from Redux --- END

  // --- Update useEffect to pass filter values ---
  useEffect(() => {
    if (rawVolumeData.length > 0 && selectedCalculation) {
      console.log("Selections changed, processing data...");

      const getDimsByIds = (ids: string[]): ReportDimension[] =>
        ids
          .map((id) => AVAILABLE_DIMENSIONS.find((d) => d.id === id))
          .filter((d): d is ReportDimension => !!d);

      // Get the single selected dimension object or empty array
      const getSingleDim = (id: string): ReportDimension[] => {
        const dim = AVAILABLE_DIMENSIONS.find((d) => d.id === id);
        return dim ? [dim] : [];
      };

      const calculationDim = MEASURES.find((m) => m.id === selectedCalculation);

      if (!calculationDim) {
        console.warn("Selected calculation dimension not found");
        setAggregationResult({
          rows: [],
          columns: [],
          data: [[]],
          valueFormat: "number",
        });
        return;
      }

      const filterDims = getDimsByIds(selectedFilters);

      // Prepare filter dimensions with their selected values
      const filtersWithValues = filterDims.map((dim) => ({
        ...dim,
        filterValues: selectedFilterValues[dim.id] || [], // Attach selected values
      }));

      const result = processReportData(
        rawVolumeData,
        filtersWithValues, // Pass dimensions with their selected values
        getSingleDim(selectedRow),
        getSingleDim(selectedColumn),
        calculationDim
      );
      setAggregationResult(result);
    } else {
      setAggregationResult({
        rows: [],
        columns: [],
        data: [[]],
        valueFormat: "number",
      });
    }
  }, [
    selectedRow,
    selectedColumn,
    selectedFilters,
    selectedFilterValues, // <-- Add to dependency array
    selectedCalculation,
    rawVolumeData,
  ]);

  // --- Handler for changing selected filter values ---
  const handleFilterValueChange = (dimensionId: string, values: string[]) => {
    setSelectedFilterValues((prev) => ({
      ...prev,
      [dimensionId]: values,
    }));
  };
  // --------------------------------------------------

  // Keep renderSelectValue for Filters
  const renderMultiSelectValue = (
    selected: string[],
    available: ReportDimension[]
  ) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {(selected as string[]).map((value) => {
        const label = available.find((d) => d.id === value)?.label || value;
        return <Chip key={value} label={label} size="small" />;
      })}
    </Box>
  );

  // --- Snackbar Handler ---
  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };
  // ------------------------

  // --- Handle Export (Updated for Snackbar) ---
  const handleExport = () => {
    console.log("Export requested");
    const rowDim =
      (selectedRow
        ? DIMENSIONS.find((d) => d.id === selectedRow)
        : undefined) ?? null;
    const colDim =
      (selectedColumn
        ? DIMENSIONS.find((d) => d.id === selectedColumn)
        : undefined) ?? null;
    const calcDim =
      (selectedCalculation
        ? MEASURES.find((m) => m.id === selectedCalculation)
        : undefined) ?? null;

    if (!calcDim) {
      console.warn("Cannot export without a selected calculation.");
      setSnackbarState({
        open: true,
        message: "Please select a Calculation before exporting.",
        severity: "warning",
      });
      return;
    }

    // Call the utility function from reportUtil
    try {
      exportReportToCSV(aggregationResult, rowDim, colDim, calcDim);
      // Optional: Show success snackbar?
      // setSnackbarState({ open: true, message: "Export started successfully!", severity: 'success' });
    } catch (error) {
      console.error("Error during exportReportToCSV call:", error);
      setSnackbarState({
        open: true,
        message: "An error occurred during export. Check console for details.",
        severity: "error",
      });
    }
  };
  // -----------------------------------------

  // --- Determine if a report is actually generated ---
  const isReportRendered =
    (aggregationResult.rows.length > 0 ||
      aggregationResult.columns.length > 0) &&
    !!selectedCalculation;
  // -------------------------------------------------

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      {/* --- Title and Toolbox Container --- */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 500,
            color: theme.palette.primary.main,
            textTransform: "uppercase",
          }}
        >
          Report Builder
        </Typography>

        {/* --- Toolbox --- */}
        <Toolbox
          tools={isReportRendered ? ["export"] : []}
          onExport={handleExport}
          onColumns={() => {}}
          onUndo={() => {}}
          onViewToggle={() => {}}
          canUndo={false}
          viewType="table"
          isDepletionsView={false}
        />
        {/* -------------- */}
      </Box>
      {/* -------------------------------- */}

      {/* Configuration Bar */}
      <Paper
        elevation={1}
        sx={{ p: 2, mb: 3, display: "flex", flexWrap: "wrap" }}
      >
        {/* Row 1: Core Selects */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {/* Rows Select */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="row-select-label">Row</InputLabel>
            <Select
              labelId="row-select-label"
              value={selectedRow}
              onChange={(e) => setSelectedRow(e.target.value as string)}
              input={<OutlinedInput label="Row" />}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>{" "}
              {/* Allow unselecting */}
              {DIMENSIONS.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Columns Select */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="column-select-label">Column</InputLabel>
            <Select
              labelId="column-select-label"
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value as string)}
              input={<OutlinedInput label="Column" />}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>{" "}
              {/* Allow unselecting */}
              {DIMENSIONS.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Calculation Select */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }} required>
            <InputLabel id="calc-select-label">Calculation</InputLabel>
            <Select
              labelId="calc-select-label"
              value={selectedCalculation}
              onChange={(e) => setSelectedCalculation(e.target.value as string)}
              input={<OutlinedInput label="Calculation" />}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>{" "}
              {MEASURES.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Filters Select (Main) */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="filters-select-label">Filters</InputLabel>
            <Select
              labelId="filters-select-label"
              multiple
              value={selectedFilters}
              onChange={(e) => setSelectedFilters(e.target.value as string[])}
              input={<OutlinedInput label="Filters" />}
              renderValue={(selected) =>
                renderMultiSelectValue(selected, DIMENSIONS)
              }
            >
              {DIMENSIONS.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Version Select */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="version-select-label">Version</InputLabel>
            <Select
              labelId="version-select-label"
              value="April Working" // Hardcode the value
              input={<OutlinedInput label="Version" />}
              disabled // Disable the dropdown for now
            >
              <MenuItem value="April Working">
                <em>April Working</em>
              </MenuItem>
              {/* No other options */}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* --- Loading State --- */}
      {depletionsStatus === "loading" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 3,
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading data...</Typography>
        </Box>
      )}

      {/* --- Error State --- */}
      {depletionsStatus === "failed" && (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" variant="filled">
            Error loading data: {depletionsError || "Unknown error"}
          </Alert>
        </Box>
      )}

      {/* --- Empty State (after loading/no error) --- */}
      {depletionsStatus === "succeeded" && rawVolumeData.length === 0 && (
        <Typography sx={{ textAlign: "center", color: "text.secondary", p: 3 }}>
          No data available.
        </Typography>
      )}

      {/* Report Table Area - Show only when succeeded and data exists */}
      {depletionsStatus === "succeeded" && rawVolumeData.length > 0 && (
        <Grid container>
          <Grid item xs={12}>
            <Paper
              elevation={1}
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                borderColor: "divider",
              }}
            >
              {/* Dynamic Filter Value Selects */}
              {selectedFilters.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    mb: 1.5,
                    px: 0.5,
                  }}
                >
                  {selectedFilters.map((filterId) => {
                    const dimension = DIMENSIONS.find((d) => d.id === filterId);
                    if (!dimension) return null;

                    const availableValues = getUniqueValuesForDimension(
                      rawVolumeData,
                      filterId
                    );
                    const currentSelection =
                      selectedFilterValues[filterId] || [];

                    return (
                      <FormControl
                        key={filterId}
                        sx={{ m: 0, minWidth: 180 }}
                        size="small"
                      >
                        <InputLabel id={`${filterId}-value-select-label`}>
                          {dimension.label}
                        </InputLabel>
                        <Select
                          labelId={`${filterId}-value-select-label`}
                          multiple
                          value={currentSelection}
                          onChange={(e) =>
                            handleFilterValueChange(
                              filterId,
                              e.target.value as string[]
                            )
                          }
                          input={
                            <OutlinedInput
                              label={dimension.label}
                              size="small"
                            />
                          }
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {selected.length > 2 ? (
                                <Chip
                                  label={`${selected.length} selected`}
                                  size="small"
                                />
                              ) : (
                                selected.map((val) => (
                                  <Chip key={val} label={val} size="small" />
                                ))
                              )}
                            </Box>
                          )}
                          MenuProps={{
                            PaperProps: { style: { maxHeight: 250 } },
                          }}
                        >
                          {availableValues.map((val) => (
                            <MenuItem key={val} value={val} dense>
                              {val}
                            </MenuItem>
                          ))}
                          {availableValues.length === 0 && (
                            <MenuItem disabled dense>
                              No values found
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>
                    );
                  })}
                </Box>
              )}

              {/* Box containing the table */}
              <Box sx={{ overflow: "auto" }}>
                <ReportTable
                  headers={{
                    rows: aggregationResult.rows,
                    columns: aggregationResult.columns,
                    valueLabel: {
                      rows: selectedRow
                        ? ([
                            DIMENSIONS.find((d) => d.id === selectedRow)?.label,
                          ].filter(Boolean) as string[])
                        : [],
                      columns: selectedColumn
                        ? ([
                            DIMENSIONS.find((d) => d.id === selectedColumn)
                              ?.label,
                          ].filter(Boolean) as string[])
                        : [],
                      value: MEASURES.find((m) => m.id === selectedCalculation)
                        ?.label,
                    },
                  }}
                  data={aggregationResult.data}
                  valueFormat={aggregationResult.valueFormat}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* --- Snackbar Component --- */}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }} // Position
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
      {/* -------------------------- */}
    </Paper>
  );
};

export default ReportBuilder;
