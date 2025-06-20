import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";
import SyncIcon from "@mui/icons-material/Sync";

interface ProductTag {
  tag_id: number;
  tag_name: string;
}

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
  nielsen_variant_size?: string;
  jenda_variant_size?: string;
  nabca_variant_size?: string;
  vistaar_variant_size?: string;
  tags?: ProductTag[];
}

export const Atlas = () => {
  const [data, setData] = useState<SKUData[]>([]);
  const [selectedSKU, setSelectedSKU] = useState<SKUData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncTargets, setSyncTargets] = useState({
    jenda: false,
    nielsen: false,
    nabca: false,
    vistaar: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [skuResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/admin/sku-master-atlas`),
        ]);

        setData(skuResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // For Atlas we display at the SKU level (no grouping)
  const tableData = data;

  const handleClose = () => {
    setSelectedSKU(null);
    setSidebarOpen(false);
  };

  const handleRowClick = (row: SKUData) => {
    setSelectedSKU(row);
    setSidebarOpen(true);
  };

  const handleToggleSyncTarget = (key: keyof typeof syncTargets) => {
    setSyncTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSync = () => {
    const selected = Object.entries(syncTargets)
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.log("Sync initiated for:", selected);
    // TODO: integrate with backend sync endpoint
    setSyncDialogOpen(false);
    // reset after sync
    setSyncTargets({
      jenda: false,
      nielsen: false,
      nabca: false,
      vistaar: false,
    });
  };

  const columns: Column[] = [
    {
      key: "brand",
      header: "Brand",
      width: 160,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "sku_description",
      header: "SKU Name",
      width: 250,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "jenda_variant_size",
      header: "Jenda Name",
      width: 160,
      render: (value) => value || "",
      sortable: true,
    },
    {
      key: "nielsen_variant_size",
      header: "Nielsen Name",
      width: 160,
      render: (value) => value || "",
      sortable: true,
    },
    {
      key: "nabca_variant_size",
      header: "NABCA Name",
      width: 160,
      render: (value) => value || "",
      sortable: true,
    },
    {
      key: "vistaar_variant_size",
      header: "Vistaar Name",
      width: 160,
      render: (value) => value || "",
      sortable: true,
    },
    {
      key: "activation_date",
      header: "Active Date",
      width: 130,
      render: (value) => value?.slice(0, 10) || "", // show YYYY-MM-DD
      sortable: true,
    },
    {
      key: "deactivation_date",
      header: "Deactive Date",
      width: 130,
      render: (value) => value?.slice(0, 10) || "",
      sortable: true,
    },
    {
      key: "sku_status",
      header: "Status",
      width: 90,
      align: "center",
      render: (value) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value === "A" ? (
            <CheckCircleIcon color="primary" fontSize="small" />
          ) : (
            <CancelIcon color="error" fontSize="small" />
          )}
        </Box>
      ),
      sortable: true,
      sortAccessor: (row) => (row.sku_status === "A" ? 1 : 0),
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      {loading ? (
        <LoadingProgress onComplete={() => setLoading(false)} />
      ) : (
        <>
          <DynamicTable
            data={tableData}
            columns={columns}
            getRowId={(row) => row.sku_id}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            onRowClick={handleRowClick}
            enableColumnFiltering
          />

          <QualSidebar
            open={sidebarOpen}
            onClose={handleClose}
            title="Product Details"
            width="500px"
          >
            <Box sx={{ p: 3 }}>
              <Stack spacing={4}>
                {/* ERP SKU Info */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    ERP SKU Info
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="SKU Name"
                      value={selectedSKU?.sku_description || ""}
                      disabled
                    />
                  </Stack>
                </Box>

                {/* Third-Party Mappings */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    sx={{ mb: 2 }}
                  >
                    Third-Party Mappings
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Nielsen Name"
                      value={selectedSKU?.nielsen_variant_size || ""}
                      onChange={(e) =>
                        setSelectedSKU((prev) =>
                          prev
                            ? {
                                ...prev,
                                nielsen_variant_size: e.target.value,
                              }
                            : prev
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      label="Jenda Name"
                      value={selectedSKU?.jenda_variant_size || ""}
                      onChange={(e) =>
                        setSelectedSKU((prev) =>
                          prev
                            ? {
                                ...prev,
                                jenda_variant_size: e.target.value,
                              }
                            : prev
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      label="NABCA Name"
                      value={selectedSKU?.nabca_variant_size || ""}
                      onChange={(e) =>
                        setSelectedSKU((prev) =>
                          prev
                            ? {
                                ...prev,
                                nabca_variant_size: e.target.value,
                              }
                            : prev
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      label="Vistaar Name"
                      value={selectedSKU?.vistaar_variant_size || ""}
                      onChange={(e) =>
                        setSelectedSKU((prev) =>
                          prev
                            ? {
                                ...prev,
                                vistaar_variant_size: e.target.value,
                              }
                            : prev
                        )
                      }
                    />
                  </Stack>
                </Box>
              </Stack>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                  mt: 4,
                }}
              >
                <Button variant="outlined" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="contained"
                  onClick={() =>
                    console.log("Sync SKU clicked", selectedSKU?.sku_id)
                  }
                >
                  Sync SKU
                </Button>
              </Box>
            </Box>
          </QualSidebar>

          {/* Sync Floating Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<SyncIcon />}
            onClick={() => setSyncDialogOpen(true)}
            sx={{
              position: "absolute",
              bottom: 16,
              left: 16,
              borderRadius: 1,
            }}
          >
            Sync Systems
          </Button>

          {/* Sync Dialog */}
          <Dialog
            open={syncDialogOpen}
            onClose={() => setSyncDialogOpen(false)}
          >
            <DialogTitle>Sync to Third-Party Systems</DialogTitle>
            <DialogContent dividers>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncTargets.jenda}
                      onChange={() => handleToggleSyncTarget("jenda")}
                    />
                  }
                  label="Jenda"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncTargets.nielsen}
                      onChange={() => handleToggleSyncTarget("nielsen")}
                    />
                  }
                  label="Nielsen"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncTargets.nabca}
                      onChange={() => handleToggleSyncTarget("nabca")}
                    />
                  }
                  label="NABCA"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={syncTargets.vistaar}
                      onChange={() => handleToggleSyncTarget("vistaar")}
                    />
                  }
                  label="Vistaar"
                />
              </FormGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSync}
                disabled={!Object.values(syncTargets).some(Boolean)}
              >
                Sync
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};
