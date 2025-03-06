import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { DynamicTable } from "../reusableComponents/dynamicTable";
import { IWSR_DATA } from "../data/data";

const IWSRExplorer: React.FC = () => {
  const [brand, setBrand] = useState<string>("");
  const [brandLine, setBrandLine] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Get unique values for filters
  const brands = useMemo(
    () => [...new Set(IWSR_DATA.map((item) => item.brand))],
    []
  );
  const brandLines = useMemo(
    () => [...new Set(IWSR_DATA.map((item) => item.brandLine))],
    []
  );
  const owners = useMemo(
    () => [...new Set(IWSR_DATA.map((item) => item.owner))],
    []
  );

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return IWSR_DATA.filter((item) => {
      if (brand && item.brand !== brand) return false;
      if (brandLine && item.brandLine !== brandLine) return false;
      if (owner && item.owner !== owner) return false;
      return true;
    });
  }, [brand, brandLine, owner]);

  const columns = [
    { key: "brand", header: "Brand", align: "left" as const },
    { key: "brandLine", header: "Brand Line", align: "left" as const },
    { key: "owner", header: "Owner", align: "left" as const },
    { key: "country", header: "Country", align: "left" as const },
    {
      key: "volume2016",
      header: "2016",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "volume2017",
      header: "2017",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "volume2018",
      header: "2018",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "volume2019",
      header: "2019",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: "volume2020",
      header: "2020",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
  ];

  const handleExport = () => {
    setShowSnackbar(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Brand</InputLabel>
          <Select
            value={brand}
            label="Brand"
            onChange={(e) => setBrand(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {brands.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Brand Line</InputLabel>
          <Select
            value={brandLine}
            label="Brand Line"
            onChange={(e) => setBrandLine(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {brandLines.map((bl) => (
              <MenuItem key={bl} value={bl}>
                {bl}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Owner</InputLabel>
          <Select
            value={owner}
            label="Owner"
            onChange={(e) => setOwner(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {owners.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
        >
          Export to Excel
        </Button>
      </Box>

      <DynamicTable
        data={filteredData}
        columns={columns}
        rowsPerPageOptions={[10, 25, { value: -1, label: "All" }]}
        defaultRowsPerPage={10}
      />

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        message="Download complete"
      />
    </Box>
  );
};

export default IWSRExplorer;
