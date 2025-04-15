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
  useTheme,
} from "@mui/material";
import { LoadingProgress } from "./loadingProgress";

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
  sortAccessor?: string | ((row: any) => number | string | null | undefined);
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

  // Flatten columns first, as displayData depends on it
  const flatColumns = useMemo(() => {
    return columns.reduce((acc: Column[], col) => {
      if (col.columnGroup && col.columns) {
        return [...acc, ...col.columns];
      }
      return [...acc, col];
    }, []);
  }, [columns]);

  const displayData = useMemo(() => {
    let sortedData = [...data];

    if (sortConfig) {
      // Get the column definition from flatColumns
      const column = flatColumns.find((col) => col.key === sortConfig.key);

      sortedData.sort((a, b) => {
        // Get the raw values
        let aValue: number | string | null | undefined;
        let bValue: number | string | null | undefined;

        // --- Get sortable values --- START
        if (typeof column?.sortAccessor === "function") {
          // 1. Use sortAccessor function if provided
          aValue = column.sortAccessor(a);
          bValue = column.sortAccessor(b);
        } else if (typeof column?.sortAccessor === "string") {
          // 2. Use sortAccessor string as a key/path
          // Simple implementation for direct keys; could be extended for deep paths
          // Add error handling for invalid paths if needed
          aValue = a[column.sortAccessor];
          bValue = b[column.sortAccessor];
        } else {
          // 3. Fallback to using the column key directly on the row data
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;

        // Handle null/undefined values (sort them consistently, e.g., to the end)
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1 * directionMultiplier; // nulls sort after defined values
        if (bValue == null) return -1 * directionMultiplier; // nulls sort after defined values

        // Numeric comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * directionMultiplier;
        }

        // String comparison (case-insensitive)
        const aStr = String(aValue);
        const bStr = String(bValue);

        return aStr.localeCompare(bStr) * directionMultiplier;
        // --- Comparison Logic --- END
      });
    }

    if (!showPagination || rowsPerPage === -1) {
      return sortedData;
    }
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [data, page, rowsPerPage, showPagination, sortConfig, flatColumns]);

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
            minHeight: "300px",
          }}
        >
          <LoadingProgress onComplete={() => {}} />
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
            <Table
              size="small"
              sx={{ borderCollapse: "collapse", tableLayout: "fixed" }}
            >
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
                          cursor:
                            column.sortable !== false ? "pointer" : "default",
                          ...column.sx,
                        }}
                        onClick={
                          column.sortable !== false
                            ? () => handleSort(column.key)
                            : undefined
                        }
                      >
                        <Box
                          sx={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {/* Centered Header Text - Apply conditional color */}
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{
                              flexGrow: 1,
                              textAlign: "center",
                              // Apply color based on sort state
                              color:
                                sortConfig?.key === column.key
                                  ? sortConfig.direction === "desc"
                                    ? "primary.main"
                                    : "error.main"
                                  : "inherit",
                            }}
                          >
                            {column.header}
                          </Typography>
                        </Box>
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
