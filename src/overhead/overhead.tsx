import React, { useState, useMemo } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Paper,
  Button,
  Typography,
} from "@mui/material";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { DIVISION_OPTIONS, type OverheadData, useForecast } from "../data/data";
import { OverheadSidebar } from "./overheadSidebar";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import { CommentDialog } from "../volume/components/CommentDialog";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export const Overhead: React.FC = () => {
  const { overheadData, overheadBudgetData, updateOverheadData } =
    useForecast();
  const [selectedDivision, setSelectedDivision] = useState<string>("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();

  const handleDivisionChange = (event: SelectChangeEvent) => {
    setSelectedDivision(event.target.value);
    setPage(0);
  };

  const calculateTotal = (months: OverheadData["months"]) => {
    return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
  };

  // Add function to find matching budget row
  const findBudgetRow = (overheadRow: OverheadData) => {
    return overheadBudgetData.find(
      (budget) => budget.id === `budget-${overheadRow.id}`
    );
  };

  // Add function to calculate budget variance percentage
  const calculateBudgetVariance = (
    overheadTotal: number,
    budgetTotal: number
  ) => {
    if (budgetTotal === 0) return 0;
    return ((overheadTotal - budgetTotal) / budgetTotal) * 100;
  };

  const filteredData = overheadData.filter((row) =>
    selectedDivision === "All" ? true : row.division === selectedDivision
  );

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setCommentDialogOpen(true);
  };

  // Add this helper function
  const hasAnyComments = () => {
    return filteredData.some((row) => row.commentary);
  };

  const columns: Column[] = useMemo(
    () => [
      {
        key: "glCode",
        header: "GL CODE",
        align: "left",
      },
      {
        key: "activity",
        header: "ACTIVITY",
        align: "left",
      },
      ...Object.keys(overheadData[0].months).map((month) => ({
        key: `months.${month}`,
        header: month,
        subHeader: overheadData[0].months[month].isActual ? "ACT" : "FCST",
        align: "right" as const,
        render: (_: any, row: OverheadData) => (
          <div style={{ position: "relative" }}>
            <Box
              component="span"
              sx={{
                color: row.months[month].isActual ? "primary.main" : "inherit",
              }}
            >
              {row.months[month].value.toLocaleString()}
            </Box>
            {row.months[month].isManuallyModified && (
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
        ),
      })),
      {
        key: "total",
        header: "TOTAL",
        align: "right",
        render: (_: any, row: OverheadData) =>
          calculateTotal(row.months).toLocaleString(),
      },
      {
        key: "budget",
        header: "BUDGET",
        align: "right",
        render: (_: any, row: OverheadData) => {
          const budgetRow = findBudgetRow(row);
          return budgetRow
            ? calculateTotal(budgetRow.months).toLocaleString()
            : "0";
        },
      },
      {
        key: "variance",
        header: "% vs BUD",
        align: "right",
        render: (_: any, row: OverheadData) => {
          const budgetRow = findBudgetRow(row);
          const overheadTotal = calculateTotal(row.months);
          const budgetTotal = budgetRow ? calculateTotal(budgetRow.months) : 0;
          const variance = calculateBudgetVariance(overheadTotal, budgetTotal);
          return (
            <Box sx={{ color: variance < 0 ? "error.main" : "success.main" }}>
              {variance.toFixed(1)}%
            </Box>
          );
        },
      },
      ...(hasAnyComments()
        ? [
            {
              key: "commentary",
              header: "COM",
              align: "center" as const,
              render: (commentary: string | undefined, _row: OverheadData) =>
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
        : []),
    ],
    [overheadData, hasAnyComments]
  );

  const selectedData = overheadData.find((row) => row.id === selectedRow);

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleSidebarSave = (updatedData: OverheadData) => {
    updateOverheadData(
      overheadData.map((row) => (row.id === updatedData.id ? updatedData : row))
    );
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const exportToExcel = (data: OverheadData[]) => {
    // Get all month keys from the first row
    const monthKeys = Object.keys(data[0].months);

    // Create headers
    const headers = [
      "GL Code",
      "Activity",
      ...monthKeys,
      "Total",
      "Budget",
      "% vs BUD",
      "Commentary",
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(","),
      ...data.map((row) => {
        const total = calculateTotal(row.months);
        const budgetRow = findBudgetRow(row);
        const budgetTotal = budgetRow ? calculateTotal(budgetRow.months) : 0;
        const variance = calculateBudgetVariance(total, budgetTotal);

        return [
          row.glCode,
          `"${row.activity}"`,
          ...monthKeys.map((month) => row.months[month].value),
          total,
          budgetTotal,
          `${variance.toFixed(1)}%`,
          row.commentary ? `"${row.commentary}"` : "",
        ].join(",");
      }),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Overhead_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "0.875rem",
              }}
            >
              DIVISION:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedDivision}
                onChange={handleDivisionChange}
                size="small"
                sx={{ fontSize: "0.875rem" }}
                displayEmpty
              >
                <MenuItem value="All">All Divisions</MenuItem>
                {DIVISION_OPTIONS.map((division) => (
                  <MenuItem key={division} value={division}>
                    {division}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportToExcel(filteredData)}
            sx={{ height: 40 }}
          >
            Export to Excel
          </Button>
        </Box>

        <DynamicTable
          data={filteredData}
          columns={columns}
          onRowClick={(row) => handleRowClick(row.id)}
          selectedRow={selectedRow}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, { value: -1, label: "All" }]}
        />
      </Paper>

      <OverheadSidebar
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
    </Box>
  );
};
