import React, { useState, useMemo } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Paper,
  Button,
  Typography,
} from "@mui/material";
import { DynamicTable, type Column } from "../reusableComponents/dynamicTable";
import EditIcon from "@mui/icons-material/Edit";
import { MarketingSidebar } from "./marketingSidebar";
import { useForecast } from "../data/data";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export type MarketingData = {
  id: string;
  brandVariant: string;
  glAccount: string;
  type: "CMI" | "Advertising" | "Promotions";
  programName:
    | "POS"
    | "Sampling"
    | "Trade Event"
    | "Incentive"
    | "Window Display"
    | "Storage"
    | "Promo Giveback";
  months: {
    [key: string]: {
      value: number;
      isActual: boolean;
      isManuallyModified?: boolean;
    };
  };
};

const BRAND_OPTIONS = [
  "The Balvenie 12",
  "The Glenfiddich 12",
  "Hendrick's Original",
];

export const Marketing: React.FC = () => {
  const { marketingData, updateMarketingData } = useForecast();
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBrandChange = (event: SelectChangeEvent) => {
    setSelectedBrand(event.target.value);
    setPage(0);
  };

  const calculateTotal = (months: MarketingData["months"]) => {
    return Object.values(months).reduce((acc, curr) => acc + curr.value, 0);
  };

  const calculateSpent = (months: MarketingData["months"]) => {
    return Object.values(months)
      .filter((month) => month.isActual)
      .reduce((acc, curr) => acc + curr.value, 0);
  };

  const filteredData = marketingData.filter((row: MarketingData) =>
    selectedBrand === "All" ? true : row.brandVariant === selectedBrand
  );

  const columns: Column[] = useMemo(
    () => [
      {
        key: "brandVariant",
        header: "BRAND VARIANT",
        align: "left",
      },
      {
        key: "glAccount",
        header: "GL ACCOUNT",
        align: "left",
      },
      {
        key: "type",
        header: "TYPE",
        align: "left",
      },
      {
        key: "programName",
        header: "PROGRAM",
        align: "left",
      },
      ...Object.keys(marketingData[0].months).map((month) => ({
        key: `months.${month}`,
        header: month,
        subHeader: marketingData[0].months[month].isActual ? "ACT" : "FCST",
        align: "right" as const,
        render: (_: any, row: MarketingData) => (
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
        key: "committed",
        header: "COMMITTED",
        align: "right",
        render: (_: any, row: MarketingData) =>
          calculateTotal(row.months).toLocaleString(),
      },
      {
        key: "spent",
        header: "SPENT",
        align: "right",
        render: (_: any, row: MarketingData) =>
          calculateSpent(row.months).toLocaleString(),
      },
      {
        key: "spendToGo",
        header: "SPEND TO GO",
        align: "right",
        render: (_: any, row: MarketingData) => {
          const committed = calculateTotal(row.months);
          const spent = calculateSpent(row.months);
          return (committed - spent).toLocaleString();
        },
      },
    ],
    [marketingData]
  );

  const selectedData = marketingData.find(
    (row: MarketingData) => row.id === selectedRow
  );

  const handleRowClick = (id: string) => {
    setSelectedRow(id);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const handleSidebarSave = (updatedData: MarketingData) => {
    updateMarketingData(
      marketingData.map((row: MarketingData) =>
        row.id === updatedData.id ? updatedData : row
      )
    );
    setSidebarOpen(false);
    setSelectedRow(null);
  };

  const exportToExcel = (data: MarketingData[]) => {
    const monthKeys = Object.keys(data[0].months);

    const headers = [
      "Brand Variant",
      "GL Account",
      "Type",
      "Program",
      ...monthKeys,
      "Committed",
      "Spent",
      "Spend To Go",
    ];

    const csvContent = [
      headers.join(","),
      ...data.map((row) => {
        const committed = calculateTotal(row.months);
        const spent = calculateSpent(row.months);
        const spendToGo = committed - spent;

        return [
          `"${row.brandVariant}"`,
          row.glAccount,
          row.type,
          `"${row.programName}"`,
          ...monthKeys.map((month) => row.months[month].value),
          committed,
          spent,
          spendToGo,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Marketing_${new Date().toISOString().split("T")[0]}.csv`
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
              BRAND VARIANT:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedBrand}
                onChange={handleBrandChange}
                size="small"
                sx={{ fontSize: "0.875rem" }}
                displayEmpty
              >
                <MenuItem value="All">All Brand Variants</MenuItem>
                {BRAND_OPTIONS.map((brand) => (
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

      <MarketingSidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        selectedData={selectedData}
        onSave={handleSidebarSave}
      />
    </Box>
  );
};
