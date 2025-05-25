import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Typography,
  Chip,
  Autocomplete,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";

interface ProductTag {
  tag_id: number;
  tag_name: string;
}

interface VariantSizePackTag {
  variant_size_pack_id: string;
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
  tags?: ProductTag[];
}

export const SKUMaster = () => {
  const [data, setData] = useState<SKUData[]>([]);
  const [selectedSKU, setSelectedSKU] = useState<SKUData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [variantSizePackTags, setVariantSizePackTags] = useState<
    VariantSizePackTag[]
  >([]);
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [pendingTagChanges, setPendingTagChanges] = useState<
    { variant_size_pack_id: string; tag_name: string }[]
  >([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [initialTags, setInitialTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [skuResponse, tagsResponse, variantTagsResponse] =
          await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL}/admin/sku-master`),
            axios.get(`${import.meta.env.VITE_API_URL}/admin/product-tags`),
            axios.get(
              `${import.meta.env.VITE_API_URL}/admin/variant-size-pack-tags`
            ),
          ]);

        setData(skuResponse.data);
        setProductTags(tagsResponse.data);
        setVariantSizePackTags(variantTagsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        // Add tags to the grouped data
        const tags = variantSizePackTags
          .filter(
            (tag) => tag.variant_size_pack_id === curr.variant_size_pack_id
          )
          .map((tag) => ({ tag_id: tag.tag_id, tag_name: tag.tag_name }));

        acc.push({ ...curr, tags });
      }
    }
    return acc;
  }, []);

  const handleSaveTags = async () => {
    if (!selectedSKU) return;

    // Get new tags from pending changes (or from Autocomplete value)
    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedSKU.variant_size_pack_id
      )
      .map((change) => change.tag_name);

    // Build the payload: just send the selected tags for this size pack
    const payload = [
      {
        variant_size_pack_id: selectedSKU.variant_size_pack_id,
        tag_names: pendingTags, // Send empty array if no tags
      },
    ];
    "Saving tags with payload:", payload;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/update-variant-size-pack-tags`,
        { tags: payload }
      );

      // Refresh the data
      const [tagsResponse, variantTagsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/admin/product-tags`),
        axios.get(
          `${import.meta.env.VITE_API_URL}/admin/variant-size-pack-tags`
        ),
      ]);

      setProductTags(tagsResponse.data);
      setVariantSizePackTags(variantTagsResponse.data);
      setPendingTagChanges([]);
      setSnackbarOpen(true);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error saving tags:", error);
    }
  };

  const handleClose = () => {
    setSelectedSKU(null);
    setSidebarOpen(false);
    setInitialTags([]);
    setPendingTagChanges([]);
  };

  const handleRowClick = (row: SKUData) => {
    setSelectedSKU(row);
    setSidebarOpen(true);
    // Store initial tags when opening sidebar
    const initialTagNames = (row.tags || []).map((tag) => tag.tag_name).sort();
    setInitialTags(initialTagNames);
    setPendingTagChanges([]);
  };

  // Helper to deduplicate tags by tag_name, preserving tag_id if present
  const dedupeTags = (tags: { tag_id: number; tag_name: string }[]) => {
    const seen = new Set();
    return tags.filter((tag) => {
      if (!tag.tag_name || !tag.tag_name.trim()) return false;
      if (seen.has(tag.tag_name)) return false;
      seen.add(tag.tag_name);
      return true;
    });
  };

  // Helper to compare arrays
  const areArraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  };

  const hasPendingChanges = () => {
    if (!selectedSKU) return false;
    const skuTags = selectedSKU.tags || [];
    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedSKU.variant_size_pack_id
      )
      .map((change) => ({ tag_id: -2, tag_name: change.tag_name }));
    const allTags = [...skuTags, ...pendingTags];
    const currentTags = dedupeTags(allTags)
      .map((tag) => tag.tag_name)
      .sort();
    return !areArraysEqual(initialTags, currentTags);
  };

  const handleCreateNewTag = () => {
    if (!newTagName.trim()) return;

    // Check if tag already exists
    if (
      productTags.some(
        (tag) => tag.tag_name.toLowerCase() === newTagName.toLowerCase()
      )
    ) {
      alert("This tag already exists");
      return;
    }

    // Add to pending changes
    if (selectedSKU) {
      setPendingTagChanges((prev) => [
        ...prev,
        {
          variant_size_pack_id: selectedSKU.variant_size_pack_id,
          tag_name: newTagName,
        },
      ]);
    }

    setNewTagDialogOpen(false);
    setNewTagName("");
  };

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

  const handleRemoveTag = (tagToRemove: ProductTag) => {
    if (!selectedSKU) return;
    const currentTags = selectedSKU.tags || [];
    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedSKU.variant_size_pack_id
      )
      .map((change) => ({ tag_id: -2, tag_name: change.tag_name }));
    const allTags = [...currentTags, ...pendingTags];
    const uniqueTags = dedupeTags(allTags);
    const newTags = uniqueTags.filter(
      (tag) => tag.tag_name !== tagToRemove.tag_name
    );
    setPendingTagChanges((prev) => {
      const filteredPrev = prev.filter(
        (change) =>
          change.variant_size_pack_id !== selectedSKU.variant_size_pack_id
      );
      const newChanges = [
        ...filteredPrev,
        ...newTags.map((tag) => ({
          variant_size_pack_id: selectedSKU.variant_size_pack_id,
          tag_name: tag.tag_name,
        })),
      ];
      return newChanges;
    });
    setSelectedSKU((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tags: newTags as ProductTag[],
      };
    });
  };

  const columns: Column[] = [
    {
      key: "brand",
      header: "Brand",
      width: 180,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "variant",
      header: "Variant",
      width: 220,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "variant_size_pack_desc",
      header: "Size Pack",
      width: 200,
      render: (value) => value,
      sortable: true,
      filterable: true,
    },
    {
      key: "tags",
      header: "Tags",
      width: 200,
      render: (_value, row) => (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {row.tags
            ?.filter((tag: ProductTag) => tag.tag_name && tag.tag_name.trim())
            .map((tag: ProductTag) => (
              <Chip
                key={tag.tag_id}
                label={tag.tag_name}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ m: 0.5 }}
              />
            ))}
        </Box>
      ),
      sortable: false,
    },
    {
      key: "active_hyperion",
      header: "Active Hyperion",
      width: 130,
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
      sortable: true,
      sortAccessor: (row) =>
        hasActiveHyperionSKUs(row.variant_size_pack_desc) ? 1 : 0,
    },
    {
      key: "active_vip",
      header: "Active VIP",
      width: 100,
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
      sortable: true,
      sortAccessor: (row) =>
        hasActiveVIPSKUs(row.variant_size_pack_desc) ? 1 : 0,
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      {loading ? (
        <LoadingProgress onComplete={() => setLoading(false)} />
      ) : (
        <>
          <DynamicTable
            data={groupedData}
            columns={columns}
            getRowId={(row) => row.variant_size_pack_id}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            onRowClick={handleRowClick}
            enableColumnFiltering
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
                    Product Tags
                  </Typography>
                  <Stack spacing={2}>
                    <Autocomplete
                      multiple
                      fullWidth
                      options={[
                        ...productTags,
                        { tag_id: -1, tag_name: "Add New Tag" },
                      ]}
                      getOptionLabel={(option) => option.tag_name}
                      isOptionEqualToValue={(option, value) =>
                        option.tag_name === value.tag_name
                      }
                      value={(() => {
                        const skuTags = selectedSKU?.tags || [];
                        const pendingTags = pendingTagChanges
                          .filter(
                            (change) =>
                              change.variant_size_pack_id ===
                              selectedSKU?.variant_size_pack_id
                          )
                          .map((change) => ({
                            tag_id: -2,
                            tag_name: change.tag_name,
                          }));
                        const allTags = [...skuTags, ...pendingTags];
                        return dedupeTags(allTags) as ProductTag[];
                      })()}
                      onChange={(_, newValue) => {
                        if (!selectedSKU) return;
                        // If Add New Tag is selected, open dialog and do not add it
                        if (newValue.some((tag) => tag.tag_id === -1)) {
                          setNewTagDialogOpen(true);
                          return;
                        }
                        // Only allow tags that exist in productTags
                        const validTags = newValue.filter((tag) =>
                          productTags.some((pt) => pt.tag_name === tag.tag_name)
                        );
                        setPendingTagChanges((prev) => [
                          ...prev.filter(
                            (change) =>
                              change.variant_size_pack_id !==
                              selectedSKU.variant_size_pack_id
                          ),
                          ...validTags.map((tag) => ({
                            variant_size_pack_id:
                              selectedSKU.variant_size_pack_id,
                            tag_name: tag.tag_name,
                          })),
                        ]);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Product Tags" />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option.tag_id}>
                          {option.tag_name}
                        </li>
                      )}
                      renderTags={(value) =>
                        value.map((option) => (
                          <Chip
                            label={option.tag_name}
                            color="primary"
                            variant="outlined"
                            onDelete={() => handleRemoveTag(option)}
                            sx={{
                              borderRadius: "16px",
                              backgroundColor: "transparent",
                              "& .MuiChip-label": { px: 1 },
                              m: 0.5,
                            }}
                          />
                        ))
                      }
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
                    {getUniqueHyperionSKUs("A").map((sku: string) => (
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
                    {getUniqueVIPSKUs("A").map((skuLabel: string) => (
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                  mt: 4,
                  borderTop: 1,
                  borderColor: "divider",
                  pt: 2,
                }}
              >
                <Button variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
                {hasPendingChanges() && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveTags}
                  >
                    Save Changes
                  </Button>
                )}
              </Box>
            </Box>
          </QualSidebar>

          <Dialog
            open={newTagDialogOpen}
            onClose={() => setNewTagDialogOpen(false)}
          >
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Tag Name"
                fullWidth
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNewTagDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateNewTag} color="primary">
                Create
              </Button>
            </DialogActions>
          </Dialog>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbarOpen(false)}
              severity="success"
              sx={{ width: "100%" }}
            >
              Product tags updated successfully!
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};
