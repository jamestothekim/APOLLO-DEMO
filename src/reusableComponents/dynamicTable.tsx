import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import {
  CustomColumnControls,
  type CustomColumnType,
} from "../volume/customColumn";

type SortDirection = "asc" | "desc";

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Column {
  key: string;
  header: string;
  subHeader?: string;
  align?: "left" | "right" | "center";
  render?: (value: any, row: any) => React.ReactNode;
  detailsOnly?: boolean;
  width?: number;
  sx?: SxProps<Theme> | ((row: any) => SxProps<Theme>);
  sortable?: boolean;
}

export interface DynamicTableProps {
  data: any[];
  columns: Column[];
  sections?: { label: string; value: string }[];
  onSectionChange?: (value: string) => void;
  onRowClick?: (row: any) => void;
  selectedRow?: string | null;
  rowsPerPageOptions?: Array<number | { value: number; label: string }>;
  defaultRowsPerPage?: number;
  page?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getRowId?: (row: any) => string;
  customColumns?: {
    id: string;
    type: CustomColumnType;
    calculate: (row: any) => number;
    label: string;
  }[];
  onAddCustomColumn?: (type: CustomColumnType) => void;
  onRemoveCustomColumn?: (columnId: string) => void;
  showPagination?: boolean;
  loading?: boolean;
  expandableRows?: boolean;
  renderExpanded?: (row: any) => React.ReactNode;
  dense?: boolean;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  data,
  columns,
  sections,
  onSectionChange,
  onRowClick,
  selectedRow,
  rowsPerPageOptions = [10, 25, 50, { value: -1, label: "All" }],
  defaultRowsPerPage = 20,
  page: controlledPage,
  onPageChange: controlledPageChange,
  rowsPerPage: controlledRowsPerPage,
  onRowsPerPageChange: controlledRowsPerPageChange,
  getRowId = (row) => row.id,
  customColumns = [],
  onAddCustomColumn,
  onRemoveCustomColumn,
  showPagination = true,
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] =
    useState(defaultRowsPerPage);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const tableColumns = useMemo(
    () => columns.filter((column) => !column.detailsOnly),
    [columns]
  );
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
      sortedData.sort((a, b) => {
        // Find the column configuration for the current sort key
        const column = [...tableColumns, ...customColumns].find(
          (col) =>
            (col as any).key === sortConfig.key ||
            (col as any).id === sortConfig.key
        );

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // If it's a custom column, use the calculate function
        if ((column as any).calculate) {
          aValue = (column as any).calculate(a);
          bValue = (column as any).calculate(b);
        }

        // If the column has a render function, we still want to sort by the raw value
        // not the rendered value, so we don't modify aValue/bValue here

        // Handle null/undefined values
        if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1;
        if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1;

        // Handle numeric values
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        // Handle string values
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (sortConfig.direction === "asc") {
          return aString.localeCompare(bString);
        }
        return bString.localeCompare(aString);
      });
    }

    if (!showPagination || rowsPerPage === -1) {
      return sortedData;
    }
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [
    data,
    page,
    rowsPerPage,
    showPagination,
    sortConfig,
    tableColumns,
    customColumns,
  ]);

  const renderTableHeader = (column: Column) => (
    <TableCell
      key={column.key}
      align={column.align}
      sx={{ fontWeight: 700, width: column.width }}
    >
      {column.sortable !== false ? (
        <TableSortLabel
          active={sortConfig?.key === column.key}
          direction={
            sortConfig?.key === column.key ? sortConfig.direction : "asc"
          }
          onClick={() => handleSort(column.key)}
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
          sx={{ fontStyle: "italic" }}
        >
          {column.subHeader}
        </Typography>
      )}
    </TableCell>
  );

  return (
    <Box>
      {(onAddCustomColumn || onRemoveCustomColumn) && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <CustomColumnControls
            onAddColumn={onAddCustomColumn!}
            onRemoveColumn={onRemoveCustomColumn!}
            customColumns={customColumns.map(({ id, type }) => ({ id, type }))}
          />
        </Box>
      )}

      <TableContainer>
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

        <Table size="small">
          <TableHead>
            <TableRow>
              {tableColumns.map(renderTableHeader)}
              {customColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align="right"
                  sx={{ fontWeight: 700 }}
                >
                  <TableSortLabel
                    active={sortConfig?.key === column.id}
                    direction={
                      sortConfig?.key === column.id
                        ? sortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.map((row) => (
              <TableRow
                key={getRowId(row)}
                hover={!!onRowClick}
                onClick={() => onRowClick?.(row)}
                selected={selectedRow === getRowId(row)}
                sx={{
                  cursor: onRowClick ? "pointer" : "default",
                  "&.Mui-selected, &.Mui-selected:hover": {
                    backgroundColor: (theme) => theme.palette.action.selected,
                  },
                }}
              >
                {tableColumns.map((column) => (
                  <TableCell key={column.key} align={column.align}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </TableCell>
                ))}
                {customColumns.map((column) => (
                  <TableCell key={column.id} align="right">
                    {column.calculate(row).toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
      </TableContainer>
    </Box>
  );
};
