import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Typography,
  Chip,
  Autocomplete,
} from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";

interface SKUData {
  brand: string;
  variant: string;
  variant_id: string;
  variant_size_pack_id: string;
  variant_size_pack_desc: string;
  size_pack_desc: string;
  abv: number;
  sku_id: string;
  sku_description: string;
  hp_brand: string;
  hp_variant: string;
  hp_size_pack: string;
  hp_sku: string;
  hp_coding: string;
  category: string;
  brand_id: string;
  units: string;
  sku_status: string;
  activation_date: string;
  deactivation_date: string;
  weight: number;
  vintage_year: string;
  unit_volume_desc: string;
  standardized_unit_volume_ml: number;
  case_equivalent_factor: string;
  case_equivalent_type: string;
  case_gtin: string;
  retail_gtin: string;
}

export const SKUMaster = () => {
  const [data, setData] = useState<SKUData[]>([]);
  const [selectedSKU, setSelectedSKU] = useState<SKUData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/sku-master`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching SKU data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique brands for the filter, sorted in descending order
  const uniqueBrands = Array.from(
    new Set(data.filter((item) => item.brand).map((item) => item.brand))
  ).sort((a, b) => {
    if (!a || !b) return 0;
    return b.localeCompare(a);
  });
  // Group data by variant_size_pack_desc and get unique entries
  // Only include groups that have at least one active SKU
  const groupedData = data.reduce((acc: SKUData[], curr) => {
    // Check if this variant_size_pack_desc already exists in our accumulator
    const existingGroup = acc.find(
      (item) => item.variant_size_pack_desc === curr.variant_size_pack_desc
    );

    // If it doesn't exist, check if this group has any active SKUs
    if (!existingGroup) {
      const allSKUsInGroup = data.filter(
        (sku) => sku.variant_size_pack_desc === curr.variant_size_pack_desc
      );
      const hasActiveSKU = allSKUsInGroup.some((sku) => sku.sku_status === "A");

      // Only add to accumulator if there's at least one active SKU
      if (hasActiveSKU) {
        acc.push(curr);
      }
    }
    return acc;
  }, []);

  // Filter grouped data by selected brand
  const filteredData = selectedBrand
    ? groupedData.filter((item) => item.brand === selectedBrand)
    : groupedData;

  // Get active and inactive SKUs for the selected variant
  const getSKUsByStatus = (status: string) => {
    if (!selectedSKU) return [];
    return data.filter(
      (sku) =>
        sku.variant_size_pack_desc === selectedSKU.variant_size_pack_desc &&
        sku.sku_status === status
    );
  };

  // Get unique SKUs for Hyperion
  const getUniqueHyperionSKUs = (status: string) => {
    if (!selectedSKU) return [];
    return Array.from(
      new Set(
        getSKUsByStatus(status)
          .filter((sku) => sku.hp_sku && sku.hp_sku !== "null")
          .map((sku) => sku.hp_sku)
      )
    );
  };

  // Get unique SKUs for VIP
  const getUniqueVIPSKUs = (status: string) => {
    if (!selectedSKU) return [];
    return Array.from(
      new Set(
        getSKUsByStatus(status).map(
          (sku) => `${sku.sku_id} - ${sku.sku_description}`
        )
      )
    );
  };

  // Helper function to check if there are any active Hyperion SKUs
  const hasActiveHyperionSKUs = (variantSizePack: string) => {
    return data.some(
      (sku) =>
        sku.variant_size_pack_desc === variantSizePack &&
        sku.sku_status === "A" &&
        sku.hp_sku &&
        sku.hp_sku !== "null"
    );
  };

  // Helper function to check if there are any active VIP SKUs
  const hasActiveVIPSKUs = (variantSizePack: string) => {
    return data.some(
      (sku) =>
        sku.variant_size_pack_desc === variantSizePack && sku.sku_status === "A"
    );
  };

  const handleClose = () => {
    setSelectedSKU(null);
    setSidebarOpen(false);
  };

  const columns: Column[] = [
    {
      key: "brand",
      header: "Brand",
      render: (value) => value,
    },
    {
      key: "variant",
      header: "Variant",
      render: (value) => value,
    },
    {
      key: "variant_size_pack_desc",
      header: "Size Pack",
      render: (value) => value,
    },
    {
      key: "active_hyperion",
      header: "Active Hyperion",
      align: "center",
      render: (_value, row) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hasActiveHyperionSKUs(row.variant_size_pack_desc) ? (
            <CheckCircleIcon color="primary" />
          ) : (
            <CancelIcon color="error" />
          )}
        </Box>
      ),
    },
    {
      key: "active_vip",
      header: "Active VIP",
      align: "center",
      render: (_value, row) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hasActiveVIPSKUs(row.variant_size_pack_desc) ? (
            <CheckCircleIcon color="primary" />
          ) : (
            <CancelIcon color="error" />
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      {loading ? (
        <LoadingProgress onComplete={() => setLoading(false)} />
      ) : (
        <>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
            <Autocomplete
              options={uniqueBrands}
              value={selectedBrand}
              onChange={(_event, newValue) => {
                setSelectedBrand(newValue);
                setPage(0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Brand"
                  size="small"
                  sx={{ width: 200 }}
                />
              )}
              clearOnBlur={false}
              freeSolo={false}
              loading={data.length === 0}
              getOptionLabel={(option) => option || ""}
            />
          </Box>

          <DynamicTable
            data={filteredData}
            columns={columns}
            getRowId={(row) => row.variant_size_pack_id}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            onRowClick={(row) => {
              setSelectedSKU(row);
              setSidebarOpen(true);
            }}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
          />

          <QualSidebar
            open={sidebarOpen}
            onClose={handleClose}
            title="SKU Details"
            width="500px"
          >
            <Box sx={{ p: 3 }}>
              <Stack spacing={4}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    Basic Information
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Brand"
                      value={selectedSKU?.brand || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Variant"
                      value={selectedSKU?.variant || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Size Pack"
                      value={selectedSKU?.variant_size_pack_desc || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Config"
                      value={selectedSKU?.size_pack_desc || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="ABV"
                      value={selectedSKU?.abv || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Category"
                      value={selectedSKU?.category || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Weight (kg)"
                      value={selectedSKU?.weight || ""}
                      disabled
                    />
                  </Stack>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    Hyperion Active SKUs
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {getUniqueHyperionSKUs("A").map((sku) => (
                      <Chip
                        key={sku}
                        label={sku}
                        color="primary"
                        variant="outlined"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    VIP Active SKUs
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {getUniqueVIPSKUs("A").map((skuLabel) => (
                      <Chip
                        key={skuLabel}
                        label={skuLabel}
                        color="default"
                        variant="outlined"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    VIP Inactive SKUs
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {getUniqueVIPSKUs("I").map((skuLabel) => (
                      <Chip
                        key={skuLabel}
                        label={skuLabel}
                        color="error"
                        variant="outlined"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              </Stack>
            </Box>
          </QualSidebar>
        </>
      )}
    </Box>
  );
};
