import { useState, useMemo, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Collapse,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Tooltip,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { useForecast } from "../data/data";
import { DiscountSidebar } from "./discountSidebar";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import { CommentDialog } from "../volume/components/commentDialog";

interface MonthData {
  value: number;
  isManuallyModified?: boolean;
  isActual: boolean;
}

interface DiscountData {
  id: string;
  key: string;
  months: {
    [key: string]: MonthData;
  };
  total: number;
  commentary?: string;
}

export const DiscountsView = () => {
  const { forecastData } = useForecast();
  const [expanded, setExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [discountDataState, setDiscountDataState] = useState<DiscountData[]>(
    []
  );
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();

  // Initialize discount data
  useEffect(() => {
    const initialData = forecastData.map((item) => ({
      id: item.id,
      key: item.variant,
      months: Object.keys(item.months).reduce((acc, month) => {
        acc[month] = {
          value: Math.round(Math.random() * 1000),
          isManuallyModified: false,
          isActual: month === "JAN",
        };
        return acc;
      }, {} as { [key: string]: MonthData }),
      total: 0,
      commentary: "",
    }));

    // Calculate totals
    initialData.forEach((item) => {
      item.total = Object.values(item.months).reduce(
        (acc, curr) => acc + curr.value,
        0
      );
      // Add flattened month data for the table
      Object.entries(item.months).forEach(([month, data]) => {
        (item as any)[`month_${month}`] = data.value;
      });
    });

    setDiscountDataState(initialData);
  }, [forecastData]);

  // Get unique variants from forecast data
  const variants = useMemo(() => {
    const uniqueVariants = new Set<string>();
    forecastData.forEach((item) => {
      uniqueVariants.add(item.variant);
    });
    return Array.from(uniqueVariants).sort();
  }, [forecastData]);

  // Update filteredDiscountData to use discountDataState
  const filteredDiscountData = useMemo(() => {
    return discountDataState.filter(
      (item) =>
        selectedVariants.length === 0 || selectedVariants.includes(item.key)
    );
  }, [discountDataState, selectedVariants]);

  const handleVariantChange = (event: any) => {
    const value = event.target.value;
    setSelectedVariants(typeof value === "string" ? value.split(",") : value);
  };

  const handleDeleteVariant = (valueToDelete: string) => {
    setSelectedVariants((prev) => prev.filter((v) => v !== valueToDelete));
  };

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleSidebarSave = (updatedData: DiscountData) => {
    setDiscountDataState((prev) =>
      prev.map((item) => {
        if (item.id === updatedData.id) {
          const newItem = { ...updatedData };
          // Add flattened month data for the table
          Object.entries(newItem.months).forEach(([month, data]) => {
            (newItem as any)[`month_${month}`] = data.value;
          });
          return newItem;
        }
        return item;
      })
    );
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setCommentDialogOpen(true);
  };

  const hasAnyComments = () => {
    return discountDataState.some((row) => row.commentary);
  };

  const columns: Column[] = useMemo(() => {
    const baseColumns: Column[] = [{ key: "key", header: "VARIANT" }];

    // Add month columns with subheaders
    const monthColumns = Object.keys(forecastData[0].months).map((month) => ({
      key: `month_${month}`,
      header: month,
      subHeader: month === "JAN" ? "ACT" : "FCST",
      align: "right" as const,
      render: (_: any, row: DiscountData) => {
        const monthData = row.months[month];
        return (
          <div style={{ position: "relative" }}>
            <Box
              component="span"
              sx={{
                color: monthData.isManuallyModified
                  ? "secondary.main"
                  : monthData.isActual
                  ? "primary.main"
                  : "inherit",
              }}
            >
              ${monthData.value.toLocaleString()}
            </Box>
            {monthData.isManuallyModified && (
              <EditIcon
                sx={{
                  fontSize: "0.875rem",
                  position: "absolute",
                  right: "-16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "secondary.main",
                }}
              />
            )}
          </div>
        );
      },
    }));

    const totalColumn: Column[] = [
      {
        key: "total",
        header: "TOTAL",
        align: "right" as const,
        render: (value: number) => `$${value.toLocaleString()}`,
      },
    ];

    const commentColumn = hasAnyComments()
      ? [
          {
            key: "commentary",
            header: "COM",
            align: "center" as const,
            render: (commentary: string | undefined, _row: DiscountData) =>
              commentary ? (
                <Box
                  onClick={(e) => handleCommentClick(e, commentary)}
                  sx={{ cursor: "pointer" }}
                >
                  <Tooltip title="View Comment">
                    <CommentIcon color="action" fontSize="small" />
                  </Tooltip>
                </Box>
              ) : null,
          },
        ]
      : [];

    return [...baseColumns, ...monthColumns, ...totalColumn, ...commentColumn];
  }, [forecastData, hasAnyComments]);

  const selectedData = discountDataState.find((row) => row.id === selectedRow);

  return (
    <Box sx={{ height: "100%" }}>
      <Paper elevation={3}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <IconButton size="small">
            {expanded ? <RemoveIcon /> : <AddIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 500, userSelect: "none" }}>
            CUSTOMER DISCOUNTS ('000)
          </Typography>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                mb: 3,
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "0.875rem",
                }}
              >
                VARIANT:
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <Select
                  multiple
                  value={selectedVariants}
                  onChange={handleVariantChange}
                  input={<OutlinedInput size="small" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onDelete={() => handleDeleteVariant(value)}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                  size="small"
                  sx={{ fontSize: "0.875rem" }}
                >
                  {variants.map((variant) => (
                    <MenuItem key={variant} value={variant}>
                      {variant}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <DynamicTable
              columns={columns}
              data={filteredDiscountData}
              onRowClick={(row) => handleRowClick(row.id)}
              selectedRow={selectedRow}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              getRowId={(row) => row.id}
            />
          </Box>
        </Collapse>

        <DiscountSidebar
          open={sidebarOpen}
          onClose={handleSidebarClose}
          selectedData={selectedData}
          onSave={handleSidebarSave}
        />

        <CommentDialog
          open={commentDialogOpen}
          onClose={() => setCommentDialogOpen(false)}
          commentary={selectedComment}
        />
      </Paper>
    </Box>
  );
};
