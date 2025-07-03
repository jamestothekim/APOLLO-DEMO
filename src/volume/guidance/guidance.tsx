import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ViewHeadlineOutlinedIcon from "@mui/icons-material/ViewHeadlineOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
// @ts-ignore – dragging lib has no types
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAppDispatch } from "../../redux/store";
import { useSelector } from "react-redux";
import {
  selectNextGuidanceId,
  setDefinitions as setGuidanceDefinitions,
  setPendingForecastCols as setPendingCols,
  setPendingForecastRows as setPendingRows,
  syncGuidanceSettings,
  incrementNextId,
  Guidance as GuidanceDef,
  addOrUpdateDefinition,
  selectPendingForecastColsIds as selColIds,
  selectPendingForecastRowsIds as selRowIds,
  selectGuidanceDefs,
  selectSummaryPendingColsIds,
  selectSummaryPendingRowsIds,
  setSummaryPendingCols,
  setSummaryPendingRows,
  removeDefinition,
  isDeletable,
  isTrends,
  canBeRow,
  createGuidanceKey,
  selectSummaryGuidanceDefs,
  selectSummaryNextGuidanceId,
  addOrUpdateSummaryDefinition,
  removeSummaryDefinition as removeSummaryDefSummary,
  setSummaryDefinitions,
  incrementSummaryNextId,
} from "../../redux/guidance/guidanceSlice";

/* ---------- CONSTANT LOOKUP TABLES ---------- */
const metricOptions = [
  { value: "vol_9l", label: "VOL 9L", short: "VOL" },
  { value: "gsv", label: "GSV", short: "GSV" },
];
const periodOptions = [
  { value: "FY", label: "Full Year", short: "FY" },
  { value: "YTD", label: "Year to Date", short: "YTD" },
  { value: "TG", label: "To Go", short: "TG" },
];
const dimensionOptions = [
  { value: "TY", label: "This Year", short: "TY" },
  { value: "LY", label: "Last Year", short: "LY" },
  { value: "LC", label: "Last Consensus", short: "LC" },
];
const calcOptions = [
  { value: "direct", label: "Value", short: "VAL" },
  { value: "diff", label: "Difference", short: "DIFF" },
  { value: "percent", label: "Percentage", short: "%" },
];

/* ---------- HELPERS ---------- */
interface GuidanceItem {
  guidance: GuidanceDef;
  rowEnabled: boolean;
  columnEnabled: boolean;
}
const makeLabel = (m: string, _p: string, d: string, c: string): string => {
  const metric = metricOptions.find((o) => o.value === m)?.short || m;
  const dimension = dimensionOptions.find((o) => o.value === d)?.short || d;
  if (c === "diff" || c === "percent") return `${metric} Δ ${dimension}`.trim();
  return `${metric} ${dimension}`.trim();
};
const makeSubLabel = (p: string, m: string, c: string): string => {
  const period = periodOptions.find((o) => o.value === p)?.short || p;
  let unit = "";
  if (c === "percent") unit = "%";
  else if (m === "vol_9l") unit = "9L";
  else if (m === "gsv") unit = "$";
  return `${period} (${unit})`;
};

/* ---------- CORE CONTENT COMPONENT ---------- */
interface GuidanceDialogInternalProps {
  onApply?: (items: GuidanceItem[]) => void;
  onCancel?: () => void;
  onSavePreferences?: (items: GuidanceItem[]) => void;
  viewContext?: "forecast" | "summary";
}
const BuilderContent: React.FC<GuidanceDialogInternalProps> = ({
  onApply,
  onCancel,
  onSavePreferences,
  viewContext = "forecast",
}) => {
  /* ----- local builder state ----- */
  const [metric, setMetric] = useState("vol_9l");
  const [period, setPeriod] = useState("FY");
  const [dimension, setDimension] = useState("LY");
  const [calc, setCalc] = useState("direct");

  const dispatch = useAppDispatch();
  const guidanceDefs = useSelector(
    viewContext === "forecast" ? selectGuidanceDefs : selectSummaryGuidanceDefs
  );
  const nextGuidanceId = useSelector(
    viewContext === "forecast"
      ? selectNextGuidanceId
      : selectSummaryNextGuidanceId
  );
  const colIds = useSelector(
    viewContext === "forecast" ? selColIds : selectSummaryPendingColsIds
  );
  const rowIds = useSelector(
    viewContext === "forecast" ? selRowIds : selectSummaryPendingRowsIds
  );

  // Convert definitions to UI items ordered by existing column order
  const defsToItems = (defs: GuidanceDef[]): GuidanceItem[] => {
    const items = defs.map((g) => ({
      guidance: g,
      rowEnabled: rowIds.includes(g.id),
      columnEnabled: colIds.includes(g.id),
    }));
    const orderMap = new Map<number, number>();
    colIds.forEach((id, idx) => orderMap.set(id, idx));
    return items.sort((a, b) => {
      const oA = orderMap.has(a.guidance.id)
        ? orderMap.get(a.guidance.id)!
        : 1000 + a.guidance.id;
      const oB = orderMap.has(b.guidance.id)
        ? orderMap.get(b.guidance.id)!
        : 1000 + b.guidance.id;
      return oA - oB;
    });
  };
  const [items, setItems] = useState<GuidanceItem[]>(defsToItems(guidanceDefs));
  useEffect(
    () => setItems(defsToItems(guidanceDefs)),
    [guidanceDefs, colIds, rowIds]
  );

  /* ----- DND reorder helper ----- */
  const reorder = (list: GuidanceItem[], start: number, end: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(start, 1);
    result.splice(end, 0, removed);
    return result;
  };
  const onDragEnd = (res: any) => {
    if (!res.destination) return;
    setItems(reorder(items, res.source.index, res.destination.index));
  };

  /* ----- Create / toggle / delete helpers ----- */
  const createNewGuidance = (): GuidanceDef => {
    const makeField = (m: string, d: string): string => {
      if (m === "vol_9l") {
        if (d === "TY") return "case_equivalent_volume";
        if (d === "LY") return "py_case_equivalent_volume";
        if (d === "LC") return "prev_published_case_equivalent_volume";
      }
      if (m === "gsv") {
        if (d === "TY") return "gross_sales_value";
        if (d === "LY") return "py_gross_sales_value";
        if (d === "LC") return "lc_gross_sales_value";
      }
      return "";
    };
    const fieldTY = makeField(metric, "TY");
    const fieldOther = makeField(metric, dimension);
    let value: any = dimension === "TY" ? fieldTY : fieldOther;
    let calculation: any = {
      type: "direct",
      format: metric === "vol_9l" ? "number" : "number",
    };
    if (calc === "diff") {
      value = { expression: `${fieldTY} - ${fieldOther}` };
      calculation = { type: "difference", format: "number" };
    } else if (calc === "percent") {
      value = {
        numerator: `${fieldTY} - ${fieldOther}`,
        denominator: fieldOther,
      };
      calculation = { type: "percentage", format: "percent" };
    }
    return {
      id: nextGuidanceId,
      label: makeLabel(metric, period, dimension, calc),
      sublabel: makeSubLabel(period, metric, calc),
      value,
      calculation,
      period: period as "FY" | "YTD" | "TG",
      metric,
      dimension,
      calcType: calc as "direct" | "diff" | "percent",
      displayType: "both",
      availability: "both",
    } as GuidanceDef;
  };
  const wouldCreateDuplicate = (): boolean =>
    items.some(
      (it) =>
        !isTrends(it.guidance) &&
        it.guidance.metric === metric &&
        it.guidance.period === period &&
        it.guidance.dimension === dimension &&
        it.guidance.calcType === calc
    );
  const handleAdd = () => {
    if (wouldCreateDuplicate()) return;
    const newGuidance = createNewGuidance();
    setItems((prev) => [
      {
        guidance: newGuidance,
        rowEnabled: period === "FY",
        columnEnabled: true,
      },
      ...prev,
    ]);
    if (viewContext === "forecast") dispatch(incrementNextId());
    else dispatch(incrementSummaryNextId());
  };
  const toggleRow = (id: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.guidance.id === id && canBeRow(i.guidance)
          ? { ...i, rowEnabled: !i.rowEnabled }
          : i
      )
    );
  const toggleCol = (id: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.guidance.id === id ? { ...i, columnEnabled: !i.columnEnabled } : i
      )
    );
  const handleDelete = (id: number) => {
    const target = items.find((i) => i.guidance.id === id);
    if (target && !isDeletable(target.guidance)) return;
    setItems((prev) => prev.filter((i) => i.guidance.id !== id));
  };

  /* ----- Apply / Save actions ----- */
  const handleApply = () => {
    // Remove logical duplicates *within this context* only
    const ctxDefs = [...guidanceDefs];
    const seen = new Set<string>();
    const duplicates: number[] = [];
    ctxDefs.forEach((g) => {
      if (isDeletable(g)) {
        const key = createGuidanceKey(g);
        if (seen.has(key)) duplicates.push(g.id);
        else seen.add(key);
      }
    });
    duplicates.forEach((id) => {
      if (viewContext === "forecast") dispatch(removeDefinition(id));
      else dispatch(removeSummaryDefSummary(id));
    });
    // add/update definitions
    items
      .filter((it) => !guidanceDefs.some((g) => g.id === it.guidance.id))
      .forEach((g) => {
        if (viewContext === "forecast")
          dispatch(addOrUpdateDefinition(g.guidance));
        else dispatch(addOrUpdateSummaryDefinition(g.guidance));
      });
    // Remove defs that were deleted in this session
    const currentIds = new Set(items.map((it) => it.guidance.id));
    ctxDefs
      .filter((g) => !currentIds.has(g.id) && isDeletable(g))
      .forEach((g) => {
        if (viewContext === "forecast") dispatch(removeDefinition(g.id));
        else dispatch(removeSummaryDefSummary(g.id));
      });
    // update selections
    const colIdList = items
      .filter((i) => i.columnEnabled)
      .map((i) => i.guidance.id);
    const rowIdList = items
      .filter((i) => i.rowEnabled)
      .map((i) => i.guidance.id);
    if (viewContext === "forecast") {
      dispatch(setPendingCols(colIdList));
      dispatch(setPendingRows(rowIdList));
    } else {
      dispatch(setSummaryPendingCols(colIdList));
      dispatch(setSummaryPendingRows(rowIdList));
    }
    // Persist to backend
    dispatch(syncGuidanceSettings());
    onApply?.(items);
    onCancel?.();
  };
  const handleSavePreferences = () => {
    const allDefs = items.map((i) => i.guidance);
    if (viewContext === "forecast") dispatch(setGuidanceDefinitions(allDefs));
    else dispatch(setSummaryDefinitions(allDefs));
    const colIdList = items
      .filter((i) => i.columnEnabled)
      .map((i) => i.guidance.id);
    const rowIdList = items
      .filter((i) => i.rowEnabled)
      .map((i) => i.guidance.id);
    if (viewContext === "forecast") {
      dispatch(setPendingCols(colIdList));
      dispatch(setPendingRows(rowIdList));
    } else {
      dispatch(setSummaryPendingCols(colIdList));
      dispatch(setSummaryPendingRows(rowIdList));
    }
    const maxId = Math.max(...allDefs.map((g) => g.id), 1);
    const newNextId = maxId + 1;
    while (nextGuidanceId < newNextId) {
      if (viewContext === "forecast") dispatch(incrementNextId());
      else dispatch(incrementSummaryNextId());
    }
    dispatch(syncGuidanceSettings());
    onSavePreferences?.(items);
  };

  /* ----- form validation side-effects ----- */
  useEffect(() => {
    if (dimension === "TY" && (calc === "diff" || calc === "percent"))
      setCalc("direct");
    if (metric === "vol_9l" && period === "FY" && dimension === "TY")
      setDimension("LY");
    if ((period === "YTD" || period === "TG") && dimension !== "TY") {
      setDimension("TY");
    }
  }, [metric, period, dimension, calc]);

  /* ----- RENDER ----- */
  return (
    <Box sx={{ p: 0 }}>
      {/* Top builder controls */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            {/* Metric */}
            <FormControl size="small" sx={{ width: 110 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={metric}
                label="Metric"
                onChange={(e: SelectChangeEvent) => setMetric(e.target.value)}
              >
                {metricOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Period */}
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                label="Period"
                onChange={(e: SelectChangeEvent) => setPeriod(e.target.value)}
              >
                {periodOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Dimension */}
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Dim</InputLabel>
              <Select
                value={dimension}
                label="Dim"
                onChange={(e: SelectChangeEvent) =>
                  setDimension(e.target.value)
                }
              >
                {dimensionOptions.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    disabled={
                      metric === "vol_9l" &&
                      period === "FY" &&
                      opt.value === "TY"
                    }
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Calculation */}
            <FormControl size="small" sx={{ width: 112 }}>
              <InputLabel>Calc</InputLabel>
              <Select
                value={calc}
                label="Calc"
                onChange={(e: SelectChangeEvent) => setCalc(e.target.value)}
              >
                {calcOptions.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    disabled={
                      dimension === "TY" &&
                      (opt.value === "diff" || opt.value === "percent")
                    }
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Add button */}
            <Box sx={{ ml: "auto" }}>
              <IconButton
                size="small"
                onClick={handleAdd}
                disabled={wouldCreateDuplicate()}
                sx={{
                  bgcolor: "primary.main",
                  color: "common.white",
                  borderRadius: 1,
                  boxShadow: "0 0 0 0 rgba(25,118,210,0.7)",
                  animation: "pulse 2.4s ease-out infinite",
                  "@keyframes pulse": {
                    "0%": { boxShadow: "0 0 0 0 rgba(25,118,210,0.7)" },
                    "70%": { boxShadow: "0 0 0 6px rgba(25,118,210,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(25,118,210,0)" },
                  },
                  "&:hover": { bgcolor: "primary.dark" },
                  "&.Mui-disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "action.disabled",
                    boxShadow: "none",
                    animation: "none",
                  },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {/* List of guidance */}
          {items.length > 0 ? (
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                height: 400,
                overflowY: "auto",
                p: 1,
              }}
            >
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="guidance-list">
                  {(provided: any) => (
                    <List
                      dense
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {items.map((item, index) => (
                        <Draggable
                          key={item.guidance.id}
                          draggableId={String(item.guidance.id)}
                          index={index}
                        >
                          {(dragProvided: any, snapshot: any) => (
                            <ListItem
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              disablePadding
                              sx={{
                                py: 0.5,
                                bgcolor: snapshot.isDragging
                                  ? "action.hover"
                                  : undefined,
                                "&:hover": {
                                  bgcolor: "action.hover",
                                  cursor: "grab",
                                },
                              }}
                            >
                              <ListItemText
                                primary={item.guidance.label}
                                secondary={item.guidance.sublabel}
                                primaryTypographyProps={{ variant: "body2" }}
                                secondaryTypographyProps={{
                                  variant: "caption",
                                }}
                                sx={{ pl: 1 }}
                              />
                              <ListItemSecondaryAction>
                                <Tooltip
                                  title={`${item.guidance.metric} ${item.guidance.period} guidance`}
                                  arrow
                                >
                                  <IconButton
                                    size="small"
                                    edge="end"
                                    sx={{ mr: 0.5 }}
                                  >
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <IconButton
                                  size="small"
                                  edge="end"
                                  onClick={() => toggleCol(item.guidance.id)}
                                >
                                  {item.columnEnabled ? (
                                    <ViewColumnIcon
                                      color="primary"
                                      fontSize="small"
                                    />
                                  ) : (
                                    <ViewColumnOutlinedIcon fontSize="small" />
                                  )}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  edge="end"
                                  onClick={() => toggleRow(item.guidance.id)}
                                  sx={{ ml: 0.5 }}
                                  disabled={!canBeRow(item.guidance)}
                                >
                                  {item.rowEnabled ? (
                                    <ViewHeadlineOutlinedIcon
                                      color="primary"
                                      fontSize="small"
                                    />
                                  ) : (
                                    <ViewHeadlineOutlinedIcon fontSize="small" />
                                  )}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  edge="end"
                                  onClick={() => handleDelete(item.guidance.id)}
                                  sx={{ ml: 0.5 }}
                                  disabled={!isDeletable(item.guidance)}
                                >
                                  <DeleteIcon
                                    fontSize="small"
                                    color={
                                      !isDeletable(item.guidance)
                                        ? "disabled"
                                        : "inherit"
                                    }
                                  />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No guidance selections yet.
            </Typography>
          )}
        </Grid>
      </Grid>
      {/* Footer */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button variant="outlined" onClick={handleSavePreferences}>
          Save Preferences
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" sx={{ mr: 1 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleApply}>
          Apply
        </Button>
      </Box>
    </Box>
  );
};

/* ---------- WRAPPER DIALOG COMPONENT ---------- */
interface GuidanceDialogProps extends GuidanceDialogInternalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}
export const GuidanceDialog: React.FC<GuidanceDialogProps> = ({
  open,
  onClose,
  title = "Guidance Settings",
  viewContext = "forecast",
  ...rest
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 500, color: (theme) => theme.palette.primary.main }}
        >
          {title.toUpperCase()}
        </Typography>
      </Box>
    </DialogTitle>
    <DialogContent dividers>
      <BuilderContent viewContext={viewContext} onCancel={onClose} {...rest} />
    </DialogContent>
  </Dialog>
);

export default BuilderContent;
