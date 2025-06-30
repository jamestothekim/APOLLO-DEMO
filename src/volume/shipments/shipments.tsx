import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Snackbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  useTheme,
  CircularProgress,
  IconButton,
  Typography,
  TableRow,
  TableCell,
} from "@mui/material";
import { QuantSidebar } from "../../reusableComponents/quantSidebar";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import { ConfigureContainer } from "./configure/configureShipments";
import type { MarketData } from "../volumeForecast";
import type { Guidance } from "../../redux/slices/userSettingsSlice";

// --- Redux Imports ---
import { useSelector } from "react-redux";
import {
  selectRawVolumeData,
  selectCustomerRawVolumeData,
} from "../../redux/slices/depletionSlice";
// ---------------------

import {
  DynamicTable,
  type Column,
} from "../../reusableComponents/dynamicTable";
import { MONTH_NAMES, calculateTotal } from "../util/volumeUtil";
import {
  Comment as CommentIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  ViewHeadlineOutlined as ViewHeadlineOutlinedIcon,
  Save as SaveIcon,
  GetApp as GetAppIcon,
} from "@mui/icons-material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// Import guidance calculations from the shared location
import { formatGuidanceValue } from "../calculations/guidanceCalculations";

// Import shipment-specific calculations
import {
  processShipmentData,
  type ShipmentData,
} from "../calculations/shipmentCalculations";

// Import shipment guidance functions
import {
  getShipmentGuidanceForSidebar,
  calculateShipmentRowGuidanceMonthlyData,
  applyShipmentGuidance,
  SHIPMENT_SIDEBAR_GUIDANCE_OPTIONS,
} from "./shipmentGuidance";

export interface ShipmentsProps {
  selectedMarkets: string[];
  selectedBrands: string[];
  selectedTags: number[];
  marketMetadata: MarketData[];
  isCustomerView: boolean;
  onUndo?: (handler: () => Promise<void>) => void;
  onExport?: (handler: () => void) => void;
  selectedGuidance?: Guidance[];
  rowGuidanceSelections?: Guidance[];
  configureOpen?: boolean;
  onConfigureClose?: () => void;
}

export const Shipments: React.FC<ShipmentsProps> = ({
  selectedMarkets,
  selectedBrands,
  selectedTags,
  isCustomerView,
  onUndo,
  onExport,
  selectedGuidance,
  rowGuidanceSelections,
  configureOpen = false,
  onConfigureClose,
}) => {
  const theme = useTheme();

  // --- Redux State for Volume Data ---
  const rawVolumeData = useSelector(selectRawVolumeData);
  const customerRawVolumeData = useSelector(selectCustomerRawVolumeData);

  // Determine the relevant data based on the view
  const relevantRawData = isCustomerView
    ? customerRawVolumeData
    : rawVolumeData;

  const [shipmentData, setShipmentData] = useState<ShipmentData[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [selectedRowForSidebar, setSelectedRowForSidebar] = useState<
    string | null
  >(null);
  const [selectedDataState, setSelectedDataState] =
    useState<ShipmentData | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [comment, setComment] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [filterChangeCount, setFilterChangeCount] = useState(0);
  const [prevFilters, setPrevFilters] = useState({
    markets: selectedMarkets,
    brands: selectedBrands,
    tags: selectedTags,
  });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Update useEffect to reset comment when selectedComment changes
  useEffect(() => {
    setComment(selectedComment || "");
  }, [selectedComment]);

  // Filter the shipment data
  const filteredData = useMemo(() => {
    return shipmentData.filter((row) => {
      const marketMatch =
        selectedMarkets.length === 0 ||
        (isCustomerView
          ? selectedMarkets.includes(row.customer_id || "")
          : selectedMarkets.includes(row.market_id));
      const brandMatch =
        selectedBrands.length === 0 || selectedBrands.includes(row.brand);

      // Add tag filtering
      const tagMatch =
        selectedTags.length === 0 ||
        (row.tags && row.tags.some((tag) => selectedTags.includes(tag.tag_id)));

      return marketMatch && brandMatch && tagMatch;
    });
  }, [
    shipmentData,
    selectedMarkets,
    selectedBrands,
    selectedTags,
    isCustomerView,
  ]);

  // Dummy undo handler for prototype
  const handleUndo = useCallback(async () => {
    showSnackbar("Undo is not available in prototype mode", "error");
  }, []);

  // Register undo handler
  useEffect(() => {
    if (onUndo) {
      onUndo(handleUndo);
    }
  }, [onUndo, handleUndo]);

  // Handler for icon click (expansion only)
  const handleExpandClick = (rowId: string) => {
    setExpandedRowIds((prevIds) => {
      const newIds = new Set(prevIds);
      if (newIds.has(rowId)) {
        newIds.delete(rowId);
      } else {
        newIds.add(rowId);
      }
      return newIds;
    });
  };

  // Handler for clicking the row itself (Sidebar selection)
  const handleSidebarSelect = (row: ShipmentData) => {
    if (row.forecast_status === "review" || row.forecast_status === "consensus")
      return;

    setSelectedRowForSidebar(row.id);
    const selectedData = filteredData.find((r) => r.id === row.id);
    if (selectedData) {
      // Deep clone to prevent mutation issues
      const clonedData = JSON.parse(JSON.stringify(selectedData));
      setSelectedDataState(clonedData);
    } else {
      setSelectedDataState(null);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setRowsPerPage(value === "All" ? -1 : parseInt(value, 10));
    setPage(0);
  };

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setComment(commentary || "");
    setCommentDialogOpen(true);
  };

  const handleCommentaryChange = (value: string) => {
    if (!selectedDataState) return;

    setSelectedDataState((prev) =>
      prev ? { ...prev, commentary: value } : prev
    );
    setHasChanges(true);
  };

  // Prototype save handler - only updates local state
  const handleSidebarSaveChanges = async () => {
    if (!selectedDataState) return;

    // Check if there are any changes that require a comment
    const hasMonthChanges = Object.keys(selectedDataState.months).some(
      (month) => selectedDataState.months[month].isManuallyModified
    );

    // If there are month changes but no commentary, show error
    if (hasMonthChanges && !selectedDataState.commentary?.trim()) {
      showSnackbar(
        "Comment required when applying shipment overrides",
        "error"
      );
      return;
    }

    try {
      // Update local state only (no backend calls)
      setShipmentData((prevData) =>
        prevData.map((item) =>
          item.id === selectedDataState.id ? selectedDataState : item
        )
      );

      setHasChanges(false);
      showSnackbar("Shipment overrides applied (prototype mode)", "success");

      // Close sidebar after successful save
      setSelectedRowForSidebar(null);
      setSelectedDataState(null);
    } catch (error) {
      console.error("Error saving changes:", error);
      showSnackbar("Failed to apply changes", "error");
    }
  };

  const columns: Column[] = useMemo(() => {
    const hasRowGuidance =
      rowGuidanceSelections && rowGuidanceSelections.length > 0;
    const cellPaddingSx = { py: "6px", px: "16px" };

    // Define the VOL 9L TY column configuration
    const volTyColumn: Column = {
      key: "total",
      header: "VOL 9L",
      subHeader: "TY",
      align: "right" as const,
      sortable: true,
      sortAccessor: (row: ShipmentData) => calculateTotal(row.months),
      sx: cellPaddingSx,
      render: (_: any, row: ShipmentData) => {
        if (row.isLoading) {
          return (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size={16} thickness={4} />
            </Box>
          );
        }
        const total = calculateTotal(row.months);
        return isNaN(total)
          ? "-"
          : total.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
      },
    };

    // Define guidance columns
    const derivedGuidanceColumns: Column[] =
      selectedGuidance?.map((guidance) => ({
        key: `guidance_${guidance.id}`,
        header: guidance.label,
        subHeader: guidance.sublabel,
        align: "right" as const,
        width: 50,
        sortable: true,
        sortAccessor: (row: ShipmentData) => {
          if (guidance.calculation.type === "multi_calc") {
            const valueKey = `guidance_${guidance.id}`;
            const value = row[valueKey];
            if (typeof value === "object" && value !== null) {
              const firstSubCalcId =
                guidance.calculation.subCalculations?.[0]?.id;
              return firstSubCalcId ? value[firstSubCalcId] : undefined;
            }
            return undefined;
          }
          const valueKey =
            typeof guidance.value === "string"
              ? guidance.value
              : `guidance_${guidance.id}`;
          return row[valueKey as keyof ShipmentData] as number | undefined;
        },
        sx: {
          ...cellPaddingSx,
          ...(guidance.id === 14 && { minWidth: 150 }),
        },
        render: (_: any, row: ShipmentData) => {
          if (row.isLoading) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={16} thickness={4} />
              </Box>
            );
          }

          const valueKey = `guidance_${guidance.id}`;
          const value = row[valueKey];

          if (
            guidance.calculation.type === "multi_calc" &&
            typeof value === "object" &&
            value !== null
          ) {
            const subCalcOrder =
              guidance.calculation.subCalculations?.map((sc) => sc.id) || [];
            const formattedParts = subCalcOrder.map((subId) => {
              const subResult = value[subId];
              return formatGuidanceValue(
                subResult,
                guidance.calculation.format
              );
            });
            return (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                  width: "100%",
                  textAlign: "right",
                }}
              >
                {formattedParts.map((part, index) => (
                  <Box key={index} sx={{ minWidth: "35px" }}>
                    {part}
                  </Box>
                ))}
              </Box>
            );
          } else if (typeof value === "number") {
            return formatGuidanceValue(
              value,
              guidance.calculation?.format,
              guidance.label
            );
          } else {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>-</Box>
            );
          }
        },
      })) || [];

    // Define Control Section
    const controlSection: Column = {
      key: "control_section",
      header: "CONTROL",
      columnGroup: true,
      columns: [
        {
          key: "market",
          header: "MARKET",
          align: "center" as const,
          sortable: true,
          sortAccessor: "market_name",
          sx: { ...cellPaddingSx, minWidth: 150 },
          filterable: true,
          getValue: (row: ShipmentData) => row.market_name,
          render: (_: any, row: ShipmentData) => {
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";
            const marketName = row.market_name;
            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLocked ? "default" : "pointer",
                  position: "relative",
                  pl: isLocked ? "24px" : "0px",
                }}
              >
                {isLocked && (
                  <LockIcon
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "1rem",
                      color: "action.disabled",
                    }}
                  />
                )}
                {isCustomerView ? row.market_name : marketName}
              </Box>
            );
          },
        },
        ...(isCustomerView
          ? [
              {
                key: "customer",
                header: "CUSTOMER",
                align: "left" as const,
                extraWide: true,
                sx: cellPaddingSx,
                render: (_: any, row: ShipmentData) => row.customer_name || "-",
              },
            ]
          : []),
        {
          key: "product",
          header: "PRODUCT",
          align: "center" as const,
          sortable: true,
          sortAccessor: (row: ShipmentData) => {
            if (!row.product) return "";
            const parts = row.product.split(" - ");
            return parts.length > 1 ? parts[1] : row.product;
          },
          extraWide: true,
          sx: cellPaddingSx,
          filterable: true,
          getValue: (row: ShipmentData) => {
            if (!row.product) return "";
            const parts = row.product.split(" - ");
            return parts.length > 1 ? parts[1] : row.product;
          },
          render: (_: any, row: ShipmentData) => {
            if (!row.product) return "-";
            const parts = row.product.split(" - ");
            const productName = parts.length > 1 ? parts[1] : row.product;
            return (
              <Box
                sx={{
                  cursor:
                    row.forecast_status === "review" ||
                    row.forecast_status === "consensus"
                      ? "default"
                      : "pointer",
                }}
              >
                {productName}
              </Box>
            );
          },
        },
      ],
    };

    // Find the index of the last actual month globally
    let lastActualMonthIndex = -1;
    shipmentData.forEach((row) => {
      MONTH_NAMES.forEach((m, index) => {
        if (row.months[m]?.isActual) {
          lastActualMonthIndex = Math.max(lastActualMonthIndex, index);
        }
      });
    });

    // Define Phasing Columns (Months + Commentary) - Remove projected, keep actual and forecast
    const monthAndCommentaryColumns: Column[] = [
      ...MONTH_NAMES.map((month, monthIndex) => {
        return {
          key: `months.${month}`,
          header: month,
          subHeader:
            monthIndex <= lastActualMonthIndex ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: "100%",
                }}
              >
                <Box component="span" sx={{ flexGrow: 1, textAlign: "center" }}>
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
            ) : (
              "FCST"
            ),
          align: "right" as const,
          sortable: true,
          sortAccessor: (row: ShipmentData) => row.months[month]?.value,
          sx: { ...cellPaddingSx, minWidth: 65 },
          render: (_: any, row: ShipmentData) => {
            if (row.isLoading) {
              return (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={16} thickness={4} />
                </Box>
              );
            }
            if (!row?.months?.[month]) return "-";
            const data = row.months[month];
            const value = data.value ?? 0;
            const isLocked =
              row.forecast_status === "review" ||
              row.forecast_status === "consensus";

            return (
              <div style={{ position: "relative" }}>
                <Box
                  component="span"
                  sx={(theme) => ({
                    color: isLocked
                      ? theme.palette.text.disabled
                      : theme.palette.text.primary,
                  })}
                >
                  {value.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </Box>
                {data.isManuallyModified && !data.isActual && (
                  <Tooltip title="Manually Edited">
                    <EditIcon
                      sx={{
                        fontSize: "0.875rem",
                        position: "absolute",
                        right: "-16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "secondary.main",
                        opacity: 0.7,
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            );
          },
        };
      }),
      // Commentary Column
      {
        key: "commentary",
        header: <DescriptionOutlinedIcon fontSize="small" />,
        align: "center" as const,
        sx: cellPaddingSx,
        render: (commentary: string | undefined) => {
          return (
            <Box
              onClick={(e) => {
                if (commentary) {
                  handleCommentClick(e, commentary);
                } else {
                  e.stopPropagation();
                }
              }}
              sx={{
                cursor: commentary ? "pointer" : "default",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "24px",
              }}
            >
              {commentary ? (
                <Tooltip title="View Comment">
                  <CommentIcon fontSize="small" color="primary" />
                </Tooltip>
              ) : (
                <Box sx={{ width: "16px" }} />
              )}
            </Box>
          );
        },
      },
    ];

    // Create the guidance columns
    let guidanceColumns = [volTyColumn, ...derivedGuidanceColumns];

    // Define the row guidance label column if needed
    if (hasRowGuidance) {
      const rowGuidanceLabelColumn: Column = {
        key: "row_guidance_label",
        header: <ViewHeadlineOutlinedIcon fontSize="small" />,
        align: "center" as const,
        sx: {
          ...cellPaddingSx,
          minWidth: 120,
        },
        render: (_: any, row: ShipmentData) => {
          const isExpanded = expandedRowIds.has(row.id);
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                height: "100%",
                width: "100%",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                >
                  VOL 9L
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ fontStyle: "italic", lineHeight: 1.1 }}
                >
                  TY
                </Typography>
              </Box>
              <IconButton
                aria-label="expand row"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandClick(row.id);
                }}
                className="row-expand-button"
                sx={{
                  position: "absolute",
                  right: -10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  p: 0.25,
                  visibility: "hidden",
                  ".MuiTableRow-root:hover &": { visibility: "visible" },
                }}
              >
                {isExpanded ? (
                  <KeyboardArrowDownIcon fontSize="inherit" />
                ) : (
                  <ChevronRightIcon fontSize="inherit" />
                )}
              </IconButton>
            </Box>
          );
        },
      };
      guidanceColumns.push(rowGuidanceLabelColumn);
    }

    // Apply the main right border to the actual last column of the guidance section
    if (guidanceColumns.length > 0) {
      const lastGuidanceIndex = guidanceColumns.length - 1;
      const lastColumn = guidanceColumns[lastGuidanceIndex];
      guidanceColumns[lastGuidanceIndex] = {
        ...lastColumn,
        sx: {
          ...(lastColumn.sx || {}),
          borderRight: "1px solid rgba(224, 224, 224, 1)",
        },
      };
    }

    // Define the final base structure
    let baseColumns: Column[] = [
      controlSection,
      {
        key: "guidance_section",
        header: "GUIDANCE",
        columnGroup: true,
        columns: guidanceColumns,
      },
      {
        key: "months_section",
        header: "PHASING",
        columnGroup: true,
        columns: monthAndCommentaryColumns,
      },
    ];

    return baseColumns;
  }, [
    selectedGuidance,
    rowGuidanceSelections,
    expandedRowIds,
    isCustomerView,
    shipmentData,
    handleCommentClick,
    handleExpandClick,
  ]);

  // Function to render the expanded content
  const renderExpandedRowContent = (
    row: ShipmentData,
    flatColumns: Column[]
  ) => {
    if (!rowGuidanceSelections || rowGuidanceSelections.length === 0) {
      return null;
    }

    const guidanceData = rowGuidanceSelections
      .map((guidance) => ({
        guidance,
        monthlyData: calculateShipmentRowGuidanceMonthlyData(row, guidance),
      }))
      .filter((item) => item.monthlyData);

    if (guidanceData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={flatColumns.length} align="center">
            <Typography variant="caption">
              Could not calculate row guidance data.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    const cellPaddingSx = { py: "6px", px: "16px" };

    return guidanceData.map(({ guidance, monthlyData }) => {
      const isLYGuidance = guidance.value === "py_case_equivalent_volume";

      return (
        <TableRow
          key={`${row.id}-${guidance.id}`}
          sx={{ backgroundColor: "action.hover" }}
        >
          {flatColumns.map((col) => {
            let cellContent: React.ReactNode = null;

            if (col.key === "expand") {
              cellContent = null;
            } else if (col.key === "row_guidance_label") {
              cellContent = (
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", lineHeight: 1.2 }}
                  >
                    {guidance.label}
                  </Typography>
                  {guidance.sublabel && (
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ fontStyle: "italic", lineHeight: 1.1 }}
                    >
                      {guidance.sublabel}
                    </Typography>
                  )}
                </Box>
              );
            } else if (col.key.startsWith("months.")) {
              const month = col.key.split(".")[1];
              const value = monthlyData ? monthlyData[month] : undefined;
              const formattedValue = formatGuidanceValue(
                value,
                guidance.calculation.format,
                guidance.label
              );

              if (isLYGuidance) {
                cellContent = (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                    }}
                  >
                    {formattedValue}
                  </Box>
                );
              } else {
                cellContent = formattedValue;
              }
            }

            return (
              <TableCell
                key={`${row.id}-${guidance.id}-${col.key}`}
                align={col.align || "left"}
                sx={{ ...col.sx, ...cellPaddingSx }}
              >
                {cellContent}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

  // Dummy export handler for prototype
  const handleExport = useCallback(() => {
    showSnackbar("Export is not available in prototype mode", "error");
  }, []);

  // Register export handler
  useEffect(() => {
    if (onExport) {
      onExport(handleExport);
    }
  }, [onExport, handleExport]);

  // Track changes
  useEffect(() => {
    if (selectedDataState) {
      const hasDataChanged =
        JSON.stringify(selectedDataState) !==
        JSON.stringify(
          shipmentData.find((row) => row.id === selectedDataState.id)
        );
      setHasChanges(hasDataChanged);
    }
  }, [selectedDataState, shipmentData]);

  // Handle month value change
  const handleMonthValueChange = (month: string, value: string) => {
    if (!selectedDataState) return;

    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setSelectedDataState((prev) => {
      if (!prev) return null;

      const updatedMonths = {
        ...prev.months,
        [month]: {
          ...prev.months[month],
          value: Math.round(numValue * 10) / 10,
          isManuallyModified: true,
        },
      };

      let updatedState = {
        ...prev,
        months: updatedMonths,
        case_equivalent_volume: calculateTotal(updatedMonths),
        manual_override: true,
      };

      if (selectedGuidance && selectedGuidance.length > 0) {
        updatedState = applyShipmentGuidance(updatedState, selectedGuidance);
      }

      return updatedState;
    });

    setHasChanges(true);
  };

  // Process raw data from Redux when it changes
  useEffect(() => {
    if (relevantRawData && relevantRawData.length > 0) {
      try {
        const processed = processShipmentData(
          relevantRawData,
          [],
          isCustomerView ?? false,
          selectedGuidance
        );
        // Filter out zero data for cleaner prototype
        const filteredData = processed.filter(
          (row) => calculateTotal(row.months) > 0
        );
        setShipmentData(filteredData);
      } catch (error) {
        console.error("Error processing shipment data:", error);
        setShipmentData([]);
      }
    }
  }, [relevantRawData, isCustomerView, selectedGuidance]);

  // Sidebar guidance values
  const sidebarGuidanceValues = useMemo(() => {
    if (!selectedDataState) return {};
    return getShipmentGuidanceForSidebar(selectedDataState);
  }, [selectedDataState]);

  // Track filter changes
  useEffect(() => {
    const hasFilterChanged =
      JSON.stringify(prevFilters.markets) !== JSON.stringify(selectedMarkets) ||
      JSON.stringify(prevFilters.brands) !== JSON.stringify(selectedBrands) ||
      JSON.stringify(prevFilters.tags) !== JSON.stringify(selectedTags);

    if (hasFilterChanged) {
      setFilterChangeCount((prev) => prev + 1);
      setPrevFilters({
        markets: selectedMarkets,
        brands: selectedBrands,
        tags: selectedTags,
      });
    }
  }, [selectedMarkets, selectedBrands, selectedTags]);

  // Button handlers for prototype
  const handleSaveClick = () => {
    console.log("Save Changes clicked - Shipments prototype mode");
    showSnackbar(
      "Save Changes: Prototype mode (no backend changes)",
      "success"
    );
  };

  const handleExportExtract = () => {
    console.log("Export Extract clicked - Shipments prototype mode");
    showSnackbar(
      "Export Extract: Prototype mode (no actual export)",
      "success"
    );
  };

  return (
    <Box>
      <DynamicTable
        data={filteredData}
        columns={columns}
        onRowClick={handleSidebarSelect}
        expandedRowIds={expandedRowIds}
        renderExpandedRow={renderExpandedRowContent}
        getRowId={(row) => row.id}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 15, 25, 50]}
        stickyHeader={true}
        maxHeight="calc(100vh)"
        enableColumnFiltering={true}
        enableRowTooltip={true}
        rowTooltipContent={(row: ShipmentData) => {
          const currentColumn = Object.keys(row).find(
            (key) => key.startsWith("guidance_") || key.startsWith("months.")
          );

          if (currentColumn) {
            const market = `Market: ${row.market_name || "N/A"}`;
            const product = `Product: ${row.variant_size_pack_desc || "N/A"}`;
            return (
              <>
                {market}
                <br />
                {product}
              </>
            );
          }
          return null;
        }}
        filterChangeCount={filterChangeCount}
      />

      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          mt: 3,
        }}
      >
        <Button variant="contained" color="primary" onClick={handleSaveClick}>
          <SaveIcon sx={{ mr: 1 }} />
          Save Changes
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleExportExtract}
        >
          <GetAppIcon sx={{ mr: 1 }} />
          Export Extract
        </Button>
      </Box>

      <QuantSidebar
        open={!!selectedRowForSidebar}
        onClose={() => {
          setSelectedRowForSidebar(null);
          setSelectedDataState(null);
        }}
        title={
          isCustomerView
            ? "Customer Shipment Details"
            : "Market Shipment Details"
        }
        marketName={selectedDataState?.market_name}
        customerName={
          isCustomerView ? selectedDataState?.customer_name : undefined
        }
        productName={selectedDataState?.product}
        forecastOptions={[]} // No logic dropdown for shipments
        pyTotalVolume={selectedDataState?.py_case_equivalent_volume}
        shipmentGuidanceSummary={
          selectedDataState
            ? {
                tyForecast: calculateTotal(selectedDataState.months),
                lyActual: selectedDataState.py_case_equivalent_volume || 0,
                inventory: selectedDataState.inventory_on_hand || 0,
                currentDDOI: selectedDataState.target_days_on_hand || 30,
                leadTimes: 45, // Default lead time for prototype
              }
            : undefined
        }
        graphData={
          selectedDataState
            ? [
                {
                  id: "shipment",
                  label: `${
                    isCustomerView
                      ? selectedDataState.customer_name
                      : selectedDataState.market_name
                  } - ${selectedDataState.product}`,
                  data: Object.entries(selectedDataState.months).map(
                    ([month, data]) => ({
                      month,
                      value: data.value,
                    })
                  ),
                  color: theme.palette.primary.main,
                },
              ]
            : []
        }
        guidanceForecasts={SHIPMENT_SIDEBAR_GUIDANCE_OPTIONS}
        availableGuidanceData={sidebarGuidanceValues}
        months={selectedDataState?.months || {}}
        onMonthValueChange={handleMonthValueChange}
        gsvRate={
          selectedDataState?.gross_sales_value
            ? selectedDataState.gross_sales_value /
              calculateTotal(selectedDataState.months)
            : undefined
        }
        commentary={selectedDataState?.commentary}
        onCommentaryChange={handleCommentaryChange}
        footerButtons={[
          {
            label: "Close",
            onClick: () => {
              setSelectedRowForSidebar(null);
              setSelectedDataState(null);
            },
            variant: "outlined",
          },
          {
            label: "Save Changes",
            onClick: handleSidebarSaveChanges,
            variant: "contained",
            disabled:
              !hasChanges ||
              // Disable if there are month changes but no comment
              (selectedDataState
                ? Object.keys(selectedDataState.months).some(
                    (month) =>
                      selectedDataState.months[month].isManuallyModified
                  ) && !selectedDataState.commentary?.trim()
                : false),
          },
        ]}
      />

      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>View Comment</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={4}
            value={comment}
            fullWidth
            InputProps={{
              readOnly: true,
              sx: { backgroundColor: "action.hover" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <ConfigureContainer
        open={configureOpen}
        onClose={onConfigureClose || (() => {})}
      />
    </Box>
  );
};
