import React, { useState, useMemo } from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  Autocomplete,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Popover,
  Chip,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { SCAN_WEEKS } from "../scanPlayData/scanData";
import { ProductEntry } from "./scanSidebarProducts";
import {
  generatePrice as generateRetailPrice,
  generateQD,
  generateRetailerMargin,
  generateLoyalty,
} from "../scanPlayData/scanDataFn";
import { getProjectedScanDollars } from "../scanUtil/scanUtil";

interface ScansPaneProps {
  products: ProductEntry[];
  setProducts: React.Dispatch<React.SetStateAction<ProductEntry[]>>;
  selectedProductIdx: number;
  selectedWeekIdx: number | null;
  setSelectedWeekIdx: React.Dispatch<React.SetStateAction<number | null>>;
  showError: (msg: string) => void;
  readOnly?: boolean;
}

const ScanSidebarScans: React.FC<ScansPaneProps> = ({
  products,
  setProducts,
  selectedProductIdx,
  selectedWeekIdx,
  setSelectedWeekIdx,
  showError,
  readOnly = false,
}) => {
  const [addingScan, setAddingScan] = useState(false);
  const [newScanWeeks, setNewScanWeeks] = useState<string[]>([]);
  const [newScanAmountStr, setNewScanAmountStr] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [editingScanIdx, setEditingScanIdx] = useState<number | null>(null);
  const [editingScanAmountStr, setEditingScanAmountStr] = useState("");

  const WEEK_OPTIONS = useMemo(() => {
    const allWeeks = SCAN_WEEKS.map((w) =>
      new Date(w.week).toLocaleDateString()
    );
    const usedWeeks = new Set(
      products[selectedProductIdx]?.scans.map((s) => s.week)
    );
    return allWeeks.filter((w) => !usedWeeks.has(w));
  }, [products, selectedProductIdx]);

  const computeMetrics = (
    prod: ProductEntry,
    weekStr: string,
    scanAmount: number
  ) => {
    const dateObj = new Date(weekStr);
    const monthIdx = dateObj.getMonth();
    const trendVal = prod.nielsenTrend?.[monthIdx]?.value ?? 0;
    const projectedMonthly =
      Math.round(trendVal * (1 + (prod.growthRate || 0)) * 10) / 10;
    const projectedScan =
      projectedMonthly * getProjectedScanDollars(prod.name, scanAmount);
    // --- Volume projections ---
    // Approximate baseline weekly volume as monthly trend divided by 4
    const baselineWeekly = trendVal / 4;
    // Simple elasticity: assume lift proportionate to scan amount up to max 10%
    const liftPct = Math.min(0.1, scanAmount / 10);
    const projectedVolume = Math.round(baselineWeekly * (1 + liftPct));
    const volumeLift = Math.round(projectedVolume - baselineWeekly);
    const volumeLiftPct = Math.round(liftPct * 1000) / 10; // one decimal
    const projectedRetail = generateRetailPrice();
    const qd = generateQD();
    const retailerMargin = generateRetailerMargin();
    const loyalty = generateLoyalty();
    return {
      projectedScan,
      projectedRetail,
      qd,
      retailerMargin,
      loyalty,
      projectedVolume,
      volumeLift,
      volumeLiftPct,
    };
  };

  // Helper to sort scans by week ascending
  const sortScansByWeek = (arr: (typeof products)[number]["scans"]) =>
    [...arr].sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
    );

  return (
    <Paper
      sx={{
        width: "100%",
        p: 0,
        height: 220,
        maxHeight: 220,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      variant="outlined"
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ flexGrow: 1, textAlign: "center" }}
        >
          SCANS
        </Typography>
        <Box>
          {!readOnly && (
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                setAddingScan(true);
                setAnchorEl(e.currentTarget);
              }}
              disabled={
                products.length === 0 ||
                selectedProductIdx < 0 ||
                !products[selectedProductIdx]
              }
              title={
                products.length === 0 ||
                selectedProductIdx < 0 ||
                !products[selectedProductIdx]
                  ? "Please select a product first"
                  : "Add Scan"
              }
            >
              <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      <Divider />
      <Popover
        open={addingScan && !readOnly}
        anchorEl={anchorEl}
        onClose={() => {
          setAddingScan(false);
          setNewScanWeeks([]);
          setNewScanAmountStr("");
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            p: 1.5,
            display: "flex",
            alignItems: "center",
            borderRadius: 2,
            boxShadow: 4,
            minWidth: 370,
            maxWidth: 370,
            ml: "-7px",
          },
        }}
      >
        <Autocomplete
          multiple
          options={WEEK_OPTIONS}
          value={newScanWeeks}
          onChange={(_e, v) => setNewScanWeeks(v as string[])}
          disableCloseOnSelect
          disableClearable
          ListboxProps={{ style: { maxHeight: 200 } }}
          renderTags={(value, getTagProps) =>
            value.length <= 1 ? (
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            ) : (
              <Chip
                label={`${value.length} Weeks`}
                size="small"
                {...getTagProps({ index: 0 })}
              />
            )
          }
          renderInput={(p) => (
            <TextField {...p} size="small" label="Week" fullWidth />
          )}
          sx={{
            width: 160,
            mr: 1,
            "& .MuiAutocomplete-inputRoot": {
              flexWrap: "nowrap",
              minHeight: 32,
            },
            "& .MuiChip-root": { maxWidth: "90px", height: 24 },
          }}
        />
        <TextField
          size="small"
          type="number"
          sx={{ width: 120, mr: 1 }}
          value={newScanAmountStr}
          onChange={(e) => setNewScanAmountStr(e.target.value)}
          inputProps={{ step: 1, min: 0 }}
          label="Scan $"
        />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            color="success"
            disabled={
              newScanWeeks.length === 0 || parseFloat(newScanAmountStr) <= 0
            }
            onClick={() => {
              const val = parseFloat(newScanAmountStr);
              if (isNaN(val) || val <= 0) {
                showError("Scan amount must be a valid number");
                return;
              }
              setProducts((prev) =>
                prev.map((p, idx) =>
                  idx === selectedProductIdx
                    ? {
                        ...p,
                        scans: sortScansByWeek([
                          ...p.scans,
                          ...newScanWeeks.map((w) => ({
                            week: w,
                            scan: val,
                            ...computeMetrics(p, w, val),
                          })),
                        ]),
                      }
                    : p
                )
              );
              setAddingScan(false);
              setNewScanWeeks([]);
              setNewScanAmountStr("");
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setAddingScan(false);
              setNewScanWeeks([]);
              setNewScanAmountStr("");
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Popover>
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "50%" }}>Week</TableCell>
              <TableCell sx={{ width: "50%" }}>Scan $</TableCell>
              <TableCell sx={{ width: "10%" }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {(products[selectedProductIdx]?.scans
              ? sortScansByWeek(products[selectedProductIdx].scans)
              : []
            ).map((scan, idx) =>
              !readOnly && editingScanIdx === idx ? (
                <TableRow
                  key={idx}
                  hover
                  selected={idx === selectedWeekIdx}
                  sx={{ height: 44 }}
                >
                  <TableCell sx={{ width: "50%" }}>{scan.week}</TableCell>
                  <TableCell sx={{ width: "50%" }}>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ width: "100%" }}
                      value={editingScanAmountStr}
                      onChange={(e) => setEditingScanAmountStr(e.target.value)}
                    />
                  </TableCell>
                  <TableCell sx={{ width: "10%" }} align="right">
                    {!readOnly && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "flex-end",
                        }}
                      >
                        <IconButton
                          size="small"
                          color="success"
                          disabled={parseFloat(editingScanAmountStr) <= 0}
                          onClick={() => {
                            const val = parseFloat(editingScanAmountStr);
                            if (isNaN(val) || val <= 0) {
                              showError("Scan amount must be a valid number");
                              return;
                            }
                            setProducts((prev) =>
                              prev.map((p, pi) =>
                                pi === selectedProductIdx
                                  ? {
                                      ...p,
                                      scans: p.scans.map((s, si) =>
                                        si === idx
                                          ? {
                                              ...s,
                                              scan: val,
                                              ...computeMetrics(p, s.week, val),
                                            }
                                          : s
                                      ),
                                    }
                                  : p
                              )
                            );
                            setEditingScanIdx(null);
                            setEditingScanAmountStr("");
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setEditingScanIdx(null)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={idx}
                  hover
                  selected={idx === selectedWeekIdx}
                  onClick={() => setSelectedWeekIdx(idx)}
                  sx={{ cursor: "pointer", height: 44 }}
                >
                  <TableCell sx={{ width: "50%" }}>{scan.week}</TableCell>
                  <TableCell sx={{ width: "50%" }}>
                    ${scan.scan.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ width: "10%" }} align="right">
                    {!readOnly && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "flex-end",
                        }}
                      >
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditingScanIdx(idx);
                            setEditingScanAmountStr(scan.scan.toString());
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProducts((prev) =>
                              prev.map((p, pi) =>
                                pi === selectedProductIdx
                                  ? {
                                      ...p,
                                      scans: p.scans.filter(
                                        (_, si) => si !== idx
                                      ),
                                    }
                                  : p
                              )
                            );
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default ScanSidebarScans;
