import React, { useState, useMemo, Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Box,
  TablePagination,
  Typography,
  SxProps,
  Theme,
  TableSortLabel,
  CircularProgress,
  useTheme,
} from "@mui/material";

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column {
  key: string;
  header: string | React.ReactNode;
  subHeader?: string;
  align?: "left" | "right" | "center";
  render?: (value: any, row: any) => React.ReactNode;
  detailsOnly?: boolean;
  width?: number;
  extraWide?: boolean;
  wide?: boolean;
  sx?: SxProps<Theme>;
  sortable?: boolean;
  sortValue?: (value: any, row: any) => number | string | null;
  columnGroup?: boolean;
  columns?: Column[];
}

export interface DynamicTableProps {
  data: any[];
  columns: Column[];
  sections?: { label: string; value: string }[];
  onSectionChange?: (value: string) => void;
  onRowClick?: (row: any) => void;
  expandedRowIds?: Set<string>;
  rowsPerPageOptions?: Array<number | { value: number; label: string }>;
  defaultRowsPerPage?: number;
  page?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getRowId?: (row: any) => string;
  showPagination?: boolean;
  expandableRows?: boolean;
  renderExpanded?: (row: any) => React.ReactNode;
  dense?: boolean;
  loading?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  renderExpandedRow?: (row: any, flatColumns: Column[]) => React.ReactNode;
}

const getSectionInfo = (columns: Column[], index: number) => {
  let currentIndex = 0;
  for (const section of columns) {
    if (section.columnGroup) {
      const sectionLength = section.columns?.length || 0;
      if (index >= currentIndex && index < currentIndex + sectionLength) {
        return {
          name: section.key,
          isFirst: index === currentIndex,
        };
      }
      currentIndex += sectionLength;
    } else {
      if (index === currentIndex) {
        return {
          name: section.key,
          isFirst: true,
        };
      }
      currentIndex += 1;
    }
  }
  return { name: "", isFirst: false };
};

export const DynamicTable: React.FC<DynamicTableProps> = ({
  data,
  columns,
  sections,
  onSectionChange,
  onRowClick,
  expandedRowIds,
  rowsPerPageOptions = [10, 25, 50, { value: -1, label: "All" }],
  defaultRowsPerPage = 10,
  page: controlledPage,
  onPageChange: controlledPageChange,
  rowsPerPage: controlledRowsPerPage,
  onRowsPerPageChange: controlledRowsPerPageChange,
  getRowId = (row) => row.id,
  showPagination = true,
  loading = false,
  stickyHeader = false,
  maxHeight = "70vh",
  renderExpandedRow,
}) => {
  const theme = useTheme();
  // All hooks must be at the top level and in the same order every time
  const [activeSection, setActiveSection] = useState(0);
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] =
    useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const page = controlledPage ?? internalPage;
  const rowsPerPage = controlledRowsPerPage ?? internalRowsPerPage;

  const handleChangePage = (event: unknown, newPage: number) => {
    if (controlledPageChange) {
      controlledPageChange(event, newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (controlledRowsPerPageChange) {
      controlledRowsPerPageChange(event);
    } else {
      setInternalRowsPerPage(newRowsPerPage);
      setInternalPage(0);
    }
  };

  const handleChangeSection = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setActiveSection(newValue);
    if (onSectionChange && sections) {
      onSectionChange(sections[newValue].value);
    }
  };

  const handleSort = (columnKey: string) => {
    setSortConfig((prevSort) => {
      if (prevSort?.key === columnKey) {
        return prevSort.direction === "asc"
          ? { key: columnKey, direction: "desc" }
          : null;
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const displayData = useMemo(() => {
    let sortedData = [...data];

    if (sortConfig) {
      // Get the column definition to access render function and sortValue function
      const column = columns.find((col) => col.key === sortConfig.key);

      console.log("Sorting column:", {
        key: sortConfig.key,
        column,
        direction: sortConfig.direction,
      });

      sortedData.sort((a, b) => {
        // Get the raw values
        const aRaw = a[sortConfig.key];
        const bRaw = b[sortConfig.key];

        // Use sortValue function if provided
        if (column?.sortValue) {
          const aValue = column.sortValue(aRaw, a);
          const bValue = column.sortValue(bRaw, b);

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return 1;
          if (bValue === null) return -1;

          // If both values are numbers, do numeric comparison
          if (typeof aValue === "number" && typeof bValue === "number") {
            return sortConfig.direction === "asc"
              ? aValue - bValue
              : bValue - aValue;
          }

          // Otherwise do string comparison
          const aStr = String(aValue);
          const bStr = String(bValue);
          return sortConfig.direction === "asc"
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        }

        // If no sortValue function, fall back to existing logic
        // Get the displayed values using the render function if it exists
        const aDisplay = column?.render ? column.render(aRaw, a) : aRaw;
        const bDisplay = column?.render ? column.render(bRaw, b) : bRaw;

        // Convert to string and clean up any HTML or special formatting
        const aValueStr =
          aDisplay != null
            ? String(aDisplay)
                .replace(/<[^>]*>/g, "")
                .trim()
            : "";
        const bValueStr =
          bDisplay != null
            ? String(bDisplay)
                .replace(/<[^>]*>/g, "")
                .trim()
            : "";

        // Try to convert to numbers if possible (handling commas)
        const aNum = parseFloat(aValueStr.replace(/,/g, ""));
        const bNum = parseFloat(bValueStr.replace(/,/g, ""));

        // If both values can be converted to numbers, do numeric comparison
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        // Otherwise do string comparison
        return sortConfig.direction === "asc"
          ? aValueStr.localeCompare(bValueStr)
          : bValueStr.localeCompare(aValueStr);
      });
    }

    if (!showPagination || rowsPerPage === -1) {
      return sortedData;
    }
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [data, page, rowsPerPage, showPagination, sortConfig, columns]);

  // Flatten columns for data display
  const flatColumns = useMemo(() => {
    return columns.reduce((acc: Column[], col) => {
      if (col.columnGroup && col.columns) {
        return [...acc, ...col.columns];
      }
      return [...acc, col];
    }, []);
  }, [columns]);

  // Define minWidth calculation logic
  const getMinWidth = (column: Column): number | undefined => {
    if (column.extraWide) return 200;
    if (column.wide) return 160; // 80% of 200
    return column.width; // Fallback to width if provided, else undefined
  };

  return (
    <Box>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {sections && (
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={activeSection}
                onChange={handleChangeSection}
                aria-label="table sections"
              >
                {sections.map((section) => (
                  <Tab key={section.value} label={section.label} />
                ))}
              </Tabs>
            </Box>
          )}

          <TableContainer
            sx={{
              ...(stickyHeader && {
                maxHeight,
                overflow: "auto",
                position: "relative",
                "& .MuiTableHead-root": {
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  bgcolor: "background.paper",
                  "& .MuiTableCell-root": {
                    position: "relative",
                    padding: "8px 8px",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderBottom: 1,
                      borderColor: "divider",
                    },
                  },
                },
              }),
              "& .MuiTableRow-root:hover .row-expand-button": {
                visibility: "visible",
              },
            }}
          >
            <Table size="small" sx={{ borderCollapse: "collapse" }}>
              <TableHead>
                {/* Group header row */}
                <TableRow>
                  {columns.map((col) => {
                    if (col.columnGroup) {
                      return (
                        <TableCell
                          key={col.key}
                          colSpan={col.columns?.length}
                          align="center"
                          sx={{
                            ...(theme.components?.MuiDynamicTable
                              ?.styleOverrides?.sectionHeader || {}),
                            minWidth: col.width,
                            ...col.sx,
                          }}
                        >
                          {col.header}
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={col.key}
                        sx={{
                          border: "none",
                          padding: "8px 8px",
                          borderBottom: 0,
                          minWidth: col.width,
                          ...col.sx,
                        }}
                      />
                    );
                  })}
                </TableRow>
                {/* Column headers row */}
                <TableRow>
                  {flatColumns.map((column, index) => {
                    const sectionInfo = getSectionInfo(columns, index);
                    const minW = getMinWidth(column);
                    return (
                      <TableCell
                        key={column.key}
                        align="center"
                        data-section={sectionInfo.name.toLowerCase()}
                        data-first-in-section={sectionInfo.isFirst}
                        sx={{
                          ...(theme.components?.MuiDynamicTable?.styleOverrides
                            ?.columnHeader || {}),
                          width: column.width,
                          minWidth: minW,
                          textAlign: "center",
                          ...column.sx,
                        }}
                      >
                        {column.sortable !== false ? (
                          <TableSortLabel
                            active={sortConfig?.key === column.key}
                            direction={
                              sortConfig?.key === column.key
                                ? sortConfig.direction
                                : "asc"
                            }
                            onClick={() => handleSort(column.key)}
                            hideSortIcon={true}
                            sx={{
                              "& .MuiTableSortLabel-icon": {
                                display: "none",
                              },
                            }}
                          >
                            {column.header}
                          </TableSortLabel>
                        ) : (
                          column.header
                        )}
                        {column.subHeader && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{
                              fontStyle: "italic",
                              marginTop: "2px",
                            }}
                          >
                            {column.subHeader}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((row) => {
                  const rowId = getRowId(row);
                  const isSelected = expandedRowIds?.has(rowId);
                  return (
                    <Fragment key={rowId}>
                      {/* --- Main Row --- */}
                      <TableRow
                        hover={!!onRowClick}
                        onClick={() => onRowClick?.(row)}
                        sx={{
                          cursor: onRowClick ? "pointer" : "default",
                        }}
                      >
                        {flatColumns.map((column, index) => {
                          const sectionInfo = getSectionInfo(columns, index);
                          const minW = getMinWidth(column);
                          return (
                            <TableCell
                              key={column.key}
                              align={column.align}
                              data-section={sectionInfo.name.toLowerCase()}
                              data-first-in-section={sectionInfo.isFirst}
                              sx={{
                                ...(theme.components?.MuiDynamicTable
                                  ?.styleOverrides?.dataCell || {}),
                                minWidth: minW,
                                ...column.sx,
                              }}
                            >
                              {column.render
                                ? column.render(row[column.key], row)
                                : row[column.key]}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* --- Expanded Content Row(s) --- */}
                      {renderExpandedRow &&
                        isSelected &&
                        renderExpandedRow(row, flatColumns)}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {showPagination && (
            <TablePagination
              component="div"
              count={data.length}
              page={rowsPerPage === -1 ? 0 : page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={rowsPerPageOptions}
              sx={{
                ".MuiTablePagination-select": {
                  fontSize: "0.875rem",
                },
                ".MuiTablePagination-displayedRows": {
                  fontSize: "0.875rem",
                },
              }}
              labelDisplayedRows={({ from, to, count }) =>
                rowsPerPage === -1
                  ? `All ${count} rows`
                  : `${from}–${to} of ${count}`
              }
            />
          )}
        </>
      )}
    </Box>
  );
};
