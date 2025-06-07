import React, { useState, useMemo, Fragment, useEffect } from "react";
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
  IconButton,
  Popover,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { LoadingProgress } from "./loadingProgress";

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column {
  key: string;
  header: string | React.ReactNode;
  subHeader?: string | React.ReactNode;
  align?: "left" | "right" | "center";
  render?: (value: any, row: any) => React.ReactNode;
  getValue?: (row: any) => any;
  detailsOnly?: boolean;
  width?: number;
  extraWide?: boolean;
  wide?: boolean;
  sx?: SxProps<Theme>;
  sortable?: boolean;
  sortAccessor?: string | ((row: any) => number | string | null | undefined);
  columnGroup?: boolean;
  columns?: Column[];
  filterable?: boolean;
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
  enableColumnFiltering?: boolean;
  enableRowTooltip?: boolean;
  rowTooltipContent?: (row: any) => React.ReactNode;
  filterChangeCount?: number;
  isNested?: boolean;
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
  enableColumnFiltering = false,
  enableRowTooltip = false,
  rowTooltipContent,
  filterChangeCount = 0,
  isNested = false,
}) => {
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState(0);
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] =
    useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [filterAnchorEl, setFilterAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const [currentFilterColumn, setCurrentFilterColumn] = useState<string | null>(
    null
  );
  const [prevFilterCount, setPrevFilterCount] = useState(filterChangeCount);

  useEffect(() => {
    if (filterChangeCount !== prevFilterCount) {
      if (controlledPageChange) {
        controlledPageChange(null, 0);
      } else {
        setInternalPage(0);
      }
      setPrevFilterCount(filterChangeCount);
    }
  }, [filterChangeCount, prevFilterCount, controlledPageChange]);

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

  const handleFilterIconClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    columnKey: string
  ) => {
    setFilterAnchorEl(event.currentTarget);
    setCurrentFilterColumn(columnKey);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setCurrentFilterColumn(null);
  };

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (currentFilterColumn) {
      setFilterValues((prev) => ({
        ...prev,
        [currentFilterColumn]: event.target.value,
      }));
      if (controlledPageChange) {
        controlledPageChange(null, 0);
      } else {
        setInternalPage(0);
      }
    }
  };

  const handleClearFilter = (columnKey: string) => {
    setFilterValues((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
    if (controlledPageChange) {
      controlledPageChange(null, 0);
    } else {
      setInternalPage(0);
    }
    handleFilterClose();
  };

  const flatColumns = useMemo(() => {
    return columns.reduce((acc: Column[], col) => {
      if (col.columnGroup && col.columns) {
        return [...acc, ...col.columns];
      }
      return [...acc, col];
    }, []);
  }, [columns]);

  const sortNestedData = (data: any[], sortConfig: SortConfig | null) => {
    if (!sortConfig || !isNested) return data;

    const totalRow = data.find((row) => row.id === "total-row");
    const dataWithoutTotal = data.filter((row) => row.id !== "total-row");

    const parentGroups = new Map<string, any[]>();
    dataWithoutTotal.forEach((row) => {
      if (row.isBrandRow) {
        parentGroups.set(row.id, [row]);
      } else if (row.parentId) {
        const parentGroup = parentGroups.get(row.parentId);
        if (parentGroup) {
          parentGroup.push(row);
        }
      }
    });

    const sortedGroups = Array.from(parentGroups.entries()).map(
      ([parentId, group]) => {
        const parent = group[0];
        const children = group.slice(1);

        const sortedChildren = [...children].sort((a, b) => {
          const column = flatColumns.find((col) => col.key === sortConfig.key);
          let aValue: number | string | null | undefined;
          let bValue: number | string | null | undefined;

          if (typeof column?.sortAccessor === "function") {
            aValue = column.sortAccessor(a);
            bValue = column.sortAccessor(b);
          } else if (typeof column?.sortAccessor === "string") {
            aValue = a[column.sortAccessor];
            bValue = b[column.sortAccessor];
          } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
          }

          const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;

          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1 * directionMultiplier;
          if (bValue == null) return -1 * directionMultiplier;

          if (typeof aValue === "number" && typeof bValue === "number") {
            return (aValue - bValue) * directionMultiplier;
          }

          const aStr = String(aValue);
          const bStr = String(bValue);

          return aStr.localeCompare(bStr) * directionMultiplier;
        });

        return [parent, ...sortedChildren];
      }
    );

    const sortedParentGroups = sortedGroups.sort(([parentA], [parentB]) => {
      const column = flatColumns.find((col) => col.key === sortConfig.key);
      let aValue: number | string | null | undefined;
      let bValue: number | string | null | undefined;

      if (typeof column?.sortAccessor === "function") {
        aValue = column.sortAccessor(parentA);
        bValue = column.sortAccessor(parentB);
      } else if (typeof column?.sortAccessor === "string") {
        aValue = parentA[column.sortAccessor];
        bValue = parentB[column.sortAccessor];
      } else {
        aValue = parentA[sortConfig.key];
        bValue = parentB[sortConfig.key];
      }

      const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1 * directionMultiplier;
      if (bValue == null) return -1 * directionMultiplier;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * directionMultiplier;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);

      return aStr.localeCompare(bStr) * directionMultiplier;
    });

    const sortedData = sortedParentGroups.flat();
    return totalRow ? [...sortedData, totalRow] : sortedData;
  };

  const displayData = useMemo(() => {
    let processedData = [...data];

    const activeFilters = Object.entries(filterValues).filter(
      ([, value]) => value && value.trim() !== ""
    );

    if (activeFilters.length > 0) {
      processedData = processedData.filter((row) => {
        return activeFilters.every(([key, filterValue]) => {
          const column = flatColumns.find((col) => col.key === key);
          let cellValue: any;

          if (column?.getValue) {
            cellValue = column.getValue(row);
          } else if (column?.render) {
            const rendered = column.render(row[key], row);
            if (typeof rendered === "string" || typeof rendered === "number") {
              cellValue = rendered;
            } else {
              cellValue = row[key];
            }
          } else {
            cellValue = row[key];
          }

          return String(cellValue)
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        });
      });
    }

    if (sortConfig) {
      if (isNested) {
        processedData = sortNestedData(processedData, sortConfig);
      } else {
        const column = flatColumns.find((col) => col.key === sortConfig.key);
        processedData.sort((a, b) => {
          let aValue: number | string | null | undefined;
          let bValue: number | string | null | undefined;

          if (typeof column?.sortAccessor === "function") {
            aValue = column.sortAccessor(a);
            bValue = column.sortAccessor(b);
          } else if (typeof column?.sortAccessor === "string") {
            aValue = a[column.sortAccessor];
            bValue = b[column.sortAccessor];
          } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
          }

          const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;

          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1 * directionMultiplier;
          if (bValue == null) return -1 * directionMultiplier;

          if (typeof aValue === "number" && typeof bValue === "number") {
            return (aValue - bValue) * directionMultiplier;
          }

          const aStr = String(aValue);
          const bStr = String(bValue);

          return aStr.localeCompare(bStr) * directionMultiplier;
        });
      }
    }

    if (!showPagination || rowsPerPage === -1) {
      return processedData;
    }
    return processedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [
    data,
    page,
    rowsPerPage,
    showPagination,
    sortConfig,
    flatColumns,
    filterValues,
    isNested,
  ]);

  const getMinWidth = (column: Column): number | undefined => {
    if (column.extraWide) return 200;
    if (column.wide) return 160;
    return column.width;
  };

  const totalFilteredCount = useMemo(() => {
    let processedData = [...data];
    const activeFilters = Object.entries(filterValues).filter(
      ([, value]) => value && value.trim() !== ""
    );
    if (activeFilters.length > 0) {
      processedData = processedData.filter((row) => {
        return activeFilters.every(([key, filterValue]) => {
          const column = flatColumns.find((col) => col.key === key);
          let cellValue: any;
          if (column?.getValue) {
            cellValue = column.getValue(row);
          } else if (column?.render) {
            const rendered = column.render(row[key], row);
            if (typeof rendered === "string" || typeof rendered === "number") {
              cellValue = rendered;
            } else {
              cellValue = row[key];
            }
          } else {
            cellValue = row[key];
          }
          return String(cellValue)
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        });
      });
    }
    return processedData.length;
  }, [data, filterValues, flatColumns]);

  return (
    <Box sx={{ width: "100%" }}>
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
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    },
                  },
                },
              }),
              ...(!stickyHeader && { overflowX: "auto" }),
              "& .MuiTableRow-root:hover .row-expand-button": {
                visibility: "visible",
              },
            }}
          >
            <Table
              size="small"
              sx={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "initial",
              }}
            >
              <TableHead>
                {columns.some((c) => c.columnGroup) && (
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
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              fontWeight: "medium",
                              p: 1,
                              ...col.sx,
                            }}
                          >
                            {col.header}
                          </TableCell>
                        );
                      } else {
                        return (
                          <TableCell
                            key={`${col.key}-placeholder`}
                            sx={{
                              borderBottom: `1px solid ${theme.palette.divider}`,
                            }}
                          />
                        );
                      }
                    })}
                  </TableRow>
                )}

                <TableRow>
                  {flatColumns.map((column, index) => {
                    const sectionInfo = getSectionInfo(columns, index);
                    const minW = getMinWidth(column);
                    const isFiltered =
                      filterValues[column.key] &&
                      filterValues[column.key].trim() !== "";
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
                          cursor:
                            column.sortable !== false ? "pointer" : "default",
                          position: "relative",
                          pr:
                            enableColumnFiltering && column.filterable
                              ? "4px"
                              : "8px",
                          pl: "8px",
                          py: 1,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          ...column.sx,
                        }}
                        onClick={
                          column.sortable !== false && !filterAnchorEl
                            ? () => handleSort(column.key)
                            : undefined
                        }
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{
                              textAlign: "center",
                              fontWeight:
                                sortConfig?.key === column.key
                                  ? "bold"
                                  : "normal",
                              color:
                                sortConfig?.key === column.key
                                  ? sortConfig.direction === "desc"
                                    ? theme.palette.error.main // Descending = Error (Red)
                                    : theme.palette.primary.main // Ascending = Primary
                                  : "inherit", // Default color
                              mr:
                                enableColumnFiltering && column.filterable
                                  ? 0.5
                                  : 0,
                            }}
                          >
                            {column.header}
                          </Typography>

                          {enableColumnFiltering && column.filterable && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFilterIconClick(e, column.key);
                              }}
                              sx={{
                                padding: "2px",
                                ml: 0.5,
                                color: isFiltered
                                  ? "white"
                                  : theme.palette.action.active,
                                opacity: isFiltered ? 1 : 0.6,
                                position: "relative",
                                transition: "all 0.2s ease-in-out",
                                backgroundColor: isFiltered
                                  ? theme.palette.primary.main
                                  : "transparent",
                                borderRadius: "50%",
                                "&:hover": {
                                  backgroundColor: isFiltered
                                    ? theme.palette.primary.dark
                                    : theme.palette.action.hover,
                                  opacity: 1,
                                  transform: "scale(1.1)",
                                },
                                "@keyframes pulse": {
                                  "0%": {
                                    transform: "scale(1)",
                                    boxShadow: isFiltered
                                      ? `0 0 0 0 ${theme.palette.primary.main}40`
                                      : "none",
                                  },
                                  "70%": {
                                    transform: "scale(1)",
                                    boxShadow: isFiltered
                                      ? `0 0 0 6px ${theme.palette.primary.main}00`
                                      : "none",
                                  },
                                  "100%": {
                                    transform: "scale(1)",
                                    boxShadow: isFiltered
                                      ? `0 0 0 0 ${theme.palette.primary.main}00`
                                      : "none",
                                  },
                                },
                                animation: isFiltered
                                  ? "pulse 2s infinite"
                                  : "none",
                              }}
                              aria-label={`Filter ${column.header}`}
                            >
                              <SearchIcon
                                sx={{
                                  fontSize: "1.0rem",
                                  transition: "transform 0.2s ease-in-out",
                                }}
                              />
                            </IconButton>
                          )}
                        </Box>
                        {column.subHeader && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{
                              fontStyle: "italic",
                              marginTop: "2px",
                              textAlign: "center",
                              width: "100%",
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
                  // const tooltipTitle = `Market: ${row.market_name || 'N/A'} - Product: ${row.variant_size_pack_desc || 'N/A'} - Logic: ${row.forecastLogic || 'N/A'}`;

                  const tableRow = (
                    <TableRow
                      hover={!!onRowClick}
                      onClick={() => onRowClick?.(row)}
                      selected={isSelected}
                      sx={{
                        cursor: onRowClick ? "pointer" : "default",
                        backgroundColor: isSelected
                          ? theme.palette.action.selected
                          : undefined,
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      {flatColumns.map((column, index) => {
                        const sectionInfo = getSectionInfo(columns, index);
                        const minW = getMinWidth(column);
                        const cellValue = row[column.key];
                        const renderedValue = column.render
                          ? column.render(cellValue, row)
                          : cellValue;
                        return (
                          <TableCell
                            key={column.key}
                            align={column.align || "left"}
                            data-section={sectionInfo.name.toLowerCase()}
                            data-first-in-section={sectionInfo.isFirst}
                            sx={{
                              ...(theme.components?.MuiDynamicTable
                                ?.styleOverrides?.dataCell || {}),
                              width: column.width,
                              minWidth: minW,
                              ...column.sx,
                            }}
                          >
                            {renderedValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );

                  return (
                    <Fragment key={rowId}>
                      {enableRowTooltip && rowTooltipContent ? (
                        <Tooltip
                          title={rowTooltipContent(row)}
                          followCursor
                          enterDelay={500}
                          enterNextDelay={300}
                        >
                          {/* The TableRow needs a DOM element to attach the tooltip to if it's directly wrapped.
                              However, Tooltip can directly wrap components if they forward refs or are native HTML.
                              For TableRow, it's safer to have it as a direct child or ensure it forwards refs properly.
                              Given Material UI's structure, wrapping it as a direct child is common.
                              If issues arise, a div wrapper around TableRow might be needed for the Tooltip. */}
                          {tableRow}
                        </Tooltip>
                      ) : (
                        tableRow
                      )}
                      {renderExpandedRow &&
                        isSelected &&
                        renderExpandedRow(row, flatColumns)}
                    </Fragment>
                  );
                })}
                {displayData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={flatColumns.length} align="center">
                      <Typography variant="body2" sx={{ py: 3 }}>
                        No matching records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {enableColumnFiltering && currentFilterColumn && (
            <Popover
              open={Boolean(filterAnchorEl)}
              anchorEl={filterAnchorEl}
              onClose={handleFilterClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              PaperProps={{
                sx: { p: 1.5, minWidth: 220, borderRadius: 1 },
              }}
            >
              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 1, fontWeight: "medium" }}
              >
                Filter by{" "}
                {flatColumns.find((c) => c.key === currentFilterColumn)
                  ?.header || "value"}
              </Typography>
              <TextField
                value={filterValues[currentFilterColumn] || ""}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
                autoFocus
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" sx={{ fontSize: "1.1rem" }} />
                    </InputAdornment>
                  ),
                  endAdornment: filterValues[currentFilterColumn] ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleClearFilter(currentFilterColumn)}
                        edge="end"
                        aria-label="clear filter"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                  sx: { fontSize: "0.875rem" },
                }}
              />
            </Popover>
          )}

          {showPagination && (
            <TablePagination
              component="div"
              count={totalFilteredCount}
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
              labelDisplayedRows={({ from, to, count }) => {
                const total = data.length;
                let ofCount =
                  count === total ? `${count}` : `${count} of ${total}`;
                if (count === 0 && total > 0) ofCount = `0 of ${total}`;
                if (count === 0 && total === 0) ofCount = `0`;

                if (rowsPerPage === -1) {
                  return `All ${ofCount} rows`;
                }
                const displayFrom = count === 0 ? 0 : from;
                const displayTo = count === 0 ? 0 : to;
                return `${displayFrom}–${displayTo} of ${ofCount}`;
              }}
            />
          )}
        </>
      )}
    </Box>
  );
};
