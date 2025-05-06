import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from "@mui/material";
import {
  AVAILABLE_DIMENSIONS,
  FILTERABLE_DIMENSIONS,
} from "./reportUtil/reportUtil";
import { Toolbox } from "../volume/components/toolbox";
import { PublishPreviewModal } from "./publishPreviewModal";
// --- Redux Imports --- START
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../redux/store";
import {
  selectRawVolumeData,
  selectVolumeDataStatus,
  selectVolumeDataError,
} from "../redux/slices/depletionSlice";
import {
  addItem,
  ReportConfig,
  PublishedItem,
} from "../redux/slices/dashboardSlice";
import { syncDashboardToBackend } from "../redux/slices/dashboardSlice";
// --- Redux Imports --- END
// --- Dashboard Component Imports (from VisualizationRenderer) --- START
// import { DashboardTable } from "../dashboard/components/DashboardTable";
// import { DashboardPieChart } from "../dashboard/components/DashboardPieChart";
// import { DashboardLineChart } from "../dashboard/components/DashboardLineChart";
import { DashboardTable } from "../dashboard/components/dashboardTable";
// --- Dashboard Component Imports --- END

// --- Constants --- START
const DIMENSIONS = AVAILABLE_DIMENSIONS.filter((d) => d.type === "dimension");
const MEASURES = AVAILABLE_DIMENSIONS.filter((d) => d.type === "measure");
const TIME_SERIES_DIMENSION_IDS = ["month", "year", "date"];
// --- Constants --- END

// --- Type for Snackbar state ---
interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
}

const ReportBuilder = () => {
  // --- Core State --- START
  const [selectedRow, setSelectedRow] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [selectedCalculation, setSelectedCalculation] = useState<string>("");
  const [currentVizType, setCurrentVizType] =
    useState<PublishedItem["type"]>("table");
  // --- Core State --- END

  // --- Filter State --- START
  const [selectedFilterDimensionId, setSelectedFilterDimensionId] =
    useState<string>("");
  // --- Filter State --- END

  // --- Other State ---
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });
  const [canPublish, setCanPublish] = useState(false);
  const [canPieChart, setCanPieChart] = useState(false);
  const [canLineChart, setCanLineChart] = useState(false);
  const [isPublishPreviewOpen, setIsPublishPreviewOpen] = useState(false);
  const [itemToPublish, setItemToPublish] = useState<{
    requiredWidth: 6 | 12;
    config: ReportConfig;
    type: PublishedItem["type"];
  } | null>(null);
  // --- End Other State ---

  // --- Redux Data Fetching ---
  const dispatch: AppDispatch = useDispatch();
  const rawVolumeData = useSelector((state: RootState) =>
    selectRawVolumeData(state)
  );
  const depletionsStatus = useSelector((state: RootState) =>
    selectVolumeDataStatus(state)
  );
  const depletionsError = useSelector((state: RootState) =>
    selectVolumeDataError(state)
  );
  const dashboardItems = useSelector(
    (state: RootState) => state.dashboard.items
  );
  // --- End Redux Data Fetching ---

  // --- Data Processing Logic --- START
  // --- Data Processing Logic --- END

  // --- Effect for deriving filter value options --- START
  // --- Effect for deriving filter value options --- END

  // --- Effect for updating Toolbox button states --- START
  useEffect(() => {
    const reportIsRendered = !!selectedCalculation && rawVolumeData.length > 0;

    setCanPublish(reportIsRendered);

    const hasRow = !!selectedRow;
    const hasCol = !!selectedColumn;
    const hasCalc = !!selectedCalculation;

    const possiblePie = hasCalc && ((hasRow && !hasCol) || (!hasRow && hasCol));
    setCanPieChart(possiblePie);

    const rowIsTimeSeries = TIME_SERIES_DIMENSION_IDS.includes(selectedRow);
    const colIsTimeSeries = TIME_SERIES_DIMENSION_IDS.includes(selectedColumn);
    const possibleLine =
      hasCalc &&
      ((hasRow && !hasCol && rowIsTimeSeries) ||
        (!hasRow && hasCol && colIsTimeSeries) ||
        (hasRow && hasCol && (rowIsTimeSeries || colIsTimeSeries)));
    setCanLineChart(possibleLine);

    if (currentVizType === "pie" && !possiblePie) {
      setCurrentVizType("table");
    }
    if (currentVizType === "line" && !possibleLine) {
      setCurrentVizType("table");
    }
  }, [
    selectedRow,
    selectedColumn,
    selectedCalculation,
    rawVolumeData.length,
    currentVizType,
  ]);
  // --- Effect for updating Toolbox button states --- END

  // --- Handlers --- START
  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const handleExport = () => {
    console.warn(
      "Export functionality needs refactoring after removing direct aggregation."
    );
    setSnackbarState({
      open: true,
      message: "Export needs update. Functionality may be limited.",
      severity: "warning",
    });
    return;
  };

  const handlePublish = () => {
    const requiredWidth: 6 | 12 = 12;

    const configToPublish: ReportConfig = {
      rowDimId: selectedRow || null,
      colDimId: selectedColumn || null,
      calcId: selectedCalculation,
      filterIds: selectedFilterDimensionId ? [selectedFilterDimensionId] : [],
      filterValues: {},
    };

    setItemToPublish({
      requiredWidth,
      config: configToPublish,
      type: currentVizType,
    });
    setIsPublishPreviewOpen(true);
  };

  const handleViewAsPie = () => {
    setCurrentVizType("pie");
    setSnackbarState({
      open: true,
      message: "Pie chart view selected.",
      severity: "info",
    });
  };

  const handleViewAsLine = () => {
    setCurrentVizType("line");
    setSnackbarState({
      open: true,
      message: "Line chart view selected.",
      severity: "info",
    });
  };

  const handleConfirmPlacement = (_index: number, name: string) => {
    if (!itemToPublish?.config || !itemToPublish?.type) {
      console.error(
        "Cannot confirm placement: item config or type is missing."
      );
      setSnackbarState({
        open: true,
        message: "Error: Report configuration missing.",
        severity: "error",
      });
      return;
    }
    const newItem: Omit<PublishedItem, "id"> = {
      type: itemToPublish.type,
      config: itemToPublish.config,
      name: name,
      gridPosition: { row: 0, col: 0, width: 12 },
      order: _index,
    };

    dispatch(addItem(newItem));
    // Sync to backend after adding item
    dispatch(
      syncDashboardToBackend(
        dashboardItems.concat({ ...newItem, id: crypto.randomUUID() })
      )
    );

    setSnackbarState({
      open: true,
      message: `Item '${name}' published successfully.`,
      severity: "success",
    });
    setItemToPublish(null);
    setIsPublishPreviewOpen(false);
  };
  // --- Handlers --- END

  // --- Build config for rendering --- START
  const currentConfigForRender: ReportConfig = {
    rowDimId: selectedRow || null,
    colDimId: selectedColumn || null,
    calcId: selectedCalculation,
    filterIds: selectedFilterDimensionId ? [selectedFilterDimensionId] : [],
    filterValues: {},
  };
  // --- Build config for rendering --- END

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
          variant="h6"
          sx={{ fontWeight: 500, color: (theme) => theme.palette.primary.main }}
        >
          REPORT BUILDER
        </Typography>
        <Toolbox
          tools={["export", "publish", "pieChart", "lineChart"]}
          canPublish={canPublish}
          onPublish={handlePublish}
          canPieChart={canPieChart}
          onPieChart={handleViewAsPie}
          canLineChart={canLineChart}
          onLineChart={handleViewAsLine}
          onExport={handleExport}
          onColumns={() => {}}
          onUndo={() => {}}
          canUndo={false}
          isDepletionsView={false}
        />
      </Box>

      {/* --- Configuration UI --- START */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* Rows Select */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="row-select-label">Row</InputLabel>
            <Select
              labelId="row-select-label"
              value={selectedRow}
              onChange={(e) => setSelectedRow(e.target.value as string)}
              input={<OutlinedInput label="Row" />}
            >
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
              {MEASURES.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* --- Filter Dimension Select --- START */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="filter-dim-select-label">Filters</InputLabel>
            <Select
              labelId="filter-dim-select-label"
              value={selectedFilterDimensionId}
              onChange={(e) => {
                setSelectedFilterDimensionId(e.target.value as string);
              }}
              input={<OutlinedInput label="Filters" />}
            >
              {FILTERABLE_DIMENSIONS.map((dim) => (
                <MenuItem key={dim.id} value={dim.id}>
                  {dim.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* --- Filter Dimension Select --- END */}

          {/* Version Select - Keep this last or reposition as needed */}
          <FormControl sx={{ m: 1, minWidth: 150, flexGrow: 1 }}>
            <InputLabel id="version-select-label">Version</InputLabel>
            <Select
              labelId="version-select-label"
              value="April Working"
              input={<OutlinedInput label="Version" />}
              disabled
            >
              <MenuItem value="April Working">
                <em>April Working</em>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      {/* --- Configuration UI --- END */}

      {/* --- Loading/Error/Empty States --- START */}
      {depletionsStatus === "loading" && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 3,
          }}
        >
          {" "}
          <CircularProgress />{" "}
          <Typography sx={{ ml: 2 }}>Loading data...</Typography>{" "}
        </Box>
      )}
      {depletionsStatus === "failed" && (
        <Box sx={{ p: 3 }}>
          {" "}
          <Alert severity="error" variant="filled">
            {" "}
            Error loading data: {depletionsError || "Unknown error"}{" "}
          </Alert>{" "}
        </Box>
      )}
      {depletionsStatus === "succeeded" && rawVolumeData.length === 0 && (
        <Typography sx={{ textAlign: "center", color: "text.secondary", p: 3 }}>
          {" "}
          No data available.{" "}
        </Typography>
      )}
      {/* --- Loading/Error/Empty States --- END */}

      {/* Report Visualization Area - Show only when succeeded and data exists */}
      {depletionsStatus === "succeeded" && rawVolumeData.length > 0 && (
        <Grid container>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                borderColor: "divider",
              }}
            >
              {/* --- Visualization Rendering Logic --- START */}
              <Box
                sx={{
                  overflow: "auto",
                  minHeight: 300,
                  mt: 0,
                }}
              >
                {currentVizType === "table" && (
                  <DashboardTable config={currentConfigForRender} />
                )}
              </Box>
              {/* --- Visualization Rendering Logic --- END */}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* --- Snackbar Component --- */}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
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

      {/* --- Publish Preview Modal --- START */}
      {itemToPublish && (
        <PublishPreviewModal
          open={isPublishPreviewOpen}
          onClose={() => {
            setIsPublishPreviewOpen(false);
            setItemToPublish(null);
          }}
          itemToPublish={itemToPublish}
          onConfirmPlacement={handleConfirmPlacement}
          existingItems={dashboardItems}
        />
      )}
      {/* --- Publish Preview Modal --- END */}
    </Paper>
  );
};

export default ReportBuilder;
