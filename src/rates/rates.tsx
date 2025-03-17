import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Button,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import { RATES_DATA, type RateData } from "../data/data";
import { RatesSidebar } from "./ratesSidebar";
import CommentIcon from "@mui/icons-material/Comment";
import { CommentDialog } from "../volume/components/commentDialog";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export const Rates = () => {
  const [expanded, setExpanded] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | undefined>();
  const [dataVersion, setDataVersion] = useState(0);

  // Add this helper function to check if any rows have comments
  const hasAnyComments = () => {
    return RATES_DATA.some((row) => row.commentary);
  };

  const columns: Column[] = useMemo(
    () => [
      { key: "skuId", header: "SKU ID" },
      { key: "skuName", header: "SKU NAME" },
      {
        key: "cogs",
        header: "COGS (PHYS)",
        align: "right",
        render: (value: number) => `$${value.toFixed(2)}`,
      },
      {
        key: "rpc",
        header: "RPC (PHYS)",
        align: "right",
        render: (value: number) => `$${value.toFixed(2)}`,
      },
      ...(hasAnyComments()
        ? [
            {
              key: "commentary",
              header: "COM",
              align: "center" as const,
              render: (commentary: string | undefined) =>
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
    [hasAnyComments, dataVersion]
  );

  // Get unique brands from SKU names
  const brands = Array.from(
    new Set(
      RATES_DATA.map((item) => {
        const brand = item.skuName.split(" ")[0];
        return brand;
      })
    )
  ).sort();

  const handleBrandChange = (event: any) => {
    const value = event.target.value;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
  };

  const handleDeleteBrand = (valueToDelete: string) => {
    setSelectedBrands((prev) => prev.filter((v) => v !== valueToDelete));
  };

  const filteredRatesData = RATES_DATA.filter(
    (item) =>
      selectedBrands.length === 0 ||
      selectedBrands.some((brand) => item.skuName.startsWith(brand))
  );

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleSidebarSave = (updatedData: RateData) => {
    const updatedRatesData = RATES_DATA.map((item) =>
      item.id === updatedData.id ? updatedData : item
    );
    Object.assign(RATES_DATA, updatedRatesData);
    setSidebarOpen(false);
    setSelectedRow(null);
    setDataVersion((v) => v + 1);
  };

  const handleCommentClick = (event: React.MouseEvent, commentary?: string) => {
    event.stopPropagation();
    setSelectedComment(commentary);
    setCommentDialogOpen(true);
  };

  const selectedData = RATES_DATA.find((row) => row.id === selectedRow);

  const exportToExcel = (data: RateData[]) => {
    // Convert data to CSV format
    const headers = [
      "SKU ID",
      "SKU Name",
      "COGS (PHYS)",
      "RPC (PHYS)",
      "Commentary",
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((row) => {
        return [
          row.skuId,
          `"${row.skuName}"`, // Wrap in quotes to handle commas in SKU names
          row.cogs,
          row.rpc,
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
      `Rates_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
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
          RATES
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 3,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
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
                BRAND:
              </Typography>
              <FormControl sx={{ minWidth: 300 }}>
                <Select
                  multiple
                  value={selectedBrands}
                  onChange={handleBrandChange}
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
                          onDelete={() => handleDeleteBrand(value)}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                  size="small"
                  sx={{ fontSize: "0.875rem" }}
                >
                  {brands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportToExcel(filteredRatesData)}
              sx={{ height: 40 }}
            >
              Export to Excel
            </Button>
          </Box>

          <DynamicTable
            columns={columns}
            data={filteredRatesData}
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

      <RatesSidebar
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
  );
};
