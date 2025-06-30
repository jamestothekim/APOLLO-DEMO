import { useEffect, useState, useMemo } from "react";
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
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../../reusableComponents/dynamicTable";
import QualSidebar from "../../../reusableComponents/qualSidebar";
import ShareIcon from "@mui/icons-material/Share";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";
import { StagingDialog, syncMaster as AtlasConfig } from "./atlas/atlas";

// Constants
const THIRD_PARTY_INTEGRATIONS = [
  { key: "nielsen_variant_size", name: "Nielsen" },
  { key: "jenda_variant_size", name: "Jenda" },
  { key: "nabca_variant_size", name: "NABCA" },
  { key: "vistaar_variant_size", name: "Vistaar" },
] as const;

const API_ENDPOINTS = {
  SKU_MASTER: "/util/get-sku-master",
  PRODUCT_TAGS: "/admin/product-tags",
  VARIANT_SIZE_PACK_TAGS: "/admin/variant-size-pack-tags",
  UPDATE_TAGS: "/admin/update-variant-size-pack-tags",
} as const;

// Types
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
  nielsen_variant_size?: string;
  jenda_variant_size?: string;
  nabca_variant_size?: string;
  vistaar_variant_size?: string;
  tags?: ProductTag[];
}

interface ProductRowData extends SKUData {
  isSizePack?: boolean;
  isExpanded?: boolean;
  childSKUs?: SKUData[];
  activeSKUCount?: number;
  inactiveSKUCount?: number;
}

type SelectionType = "size_pack" | "sku";

// Integration Indicator Component
const IntegrationIndicator = ({ sku }: { sku: SKUData }) => {
  const theme = useTheme();

  const getIntegrationStatus = () => {
    const mapped = THIRD_PARTY_INTEGRATIONS.filter(
      (integration) => sku[integration.key] && sku[integration.key]?.trim()
    );

    return {
      mapped,
      total: THIRD_PARTY_INTEGRATIONS.length,
      completedCount: mapped.length,
      status:
        mapped.length === 0
          ? "none"
          : mapped.length === THIRD_PARTY_INTEGRATIONS.length
          ? "complete"
          : "partial",
    };
  };

  const { completedCount, total, status } = getIntegrationStatus();

  const getBadgeColors = () => {
    switch (status) {
      case "complete":
        return {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          border: `1px solid ${theme.palette.primary.main}`,
        };
      case "partial":
        return {
          backgroundColor: theme.palette.secondary.light,
          color: theme.palette.secondary.contrastText,
          border: `1px solid ${theme.palette.secondary.main}`,
        };
      default:
        return {
          backgroundColor: theme.palette.grey[200],
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.grey[400]}`,
        };
    }
  };

  const getTooltipContent = () => (
    <Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: "bold", display: "block", mb: 0.5, color: "white" }}
      >
        Third-Party Integrations ({completedCount}/{total})
      </Typography>
      {THIRD_PARTY_INTEGRATIONS.map((integration) => (
        <Typography
          key={integration.name}
          variant="caption"
          sx={{ display: "block", color: "rgba(255, 255, 255, 0.8)" }}
        >
          {sku[integration.key] && sku[integration.key]?.trim() ? "✓" : "x"}{" "}
          {integration.name}
          {sku[integration.key] &&
            sku[integration.key]?.trim() &&
            `: ${sku[integration.key]}`}
        </Typography>
      ))}
    </Box>
  );

  return (
    <Tooltip title={getTooltipContent()} arrow placement="top">
      <Box
        sx={{
          ...getBadgeColors(),
          cursor: "pointer",
          ml: 1,
          borderRadius: "12px",
          px: 0.9,
          py: 0.5,
          display: "inline-block",
          flexShrink: 0,
          verticalAlign: "middle",
          fontSize: "0.7rem",
          fontWeight: "medium",
          lineHeight: 1,
          minWidth: "20px",
          textAlign: "center",
        }}
      >
        {completedCount}/{total}
      </Box>
    </Tooltip>
  );
};

export const ProductMaster = () => {
  // Data state
  const [data, setData] = useState<SKUData[]>([]);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [variantSizePackTags, setVariantSizePackTags] = useState<
    VariantSizePackTag[]
  >([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [stagingDialogOpen, setStagingDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Selection state
  const [selectedItem, setSelectedItem] = useState<ProductRowData | null>(null);
  const [selectionType, setSelectionType] =
    useState<SelectionType>("size_pack");
  const [expandedSizePacks, setExpandedSizePacks] = useState<Set<string>>(
    new Set()
  );

  // Form state
  const [newTagName, setNewTagName] = useState("");
  const [pendingTagChanges, setPendingTagChanges] = useState<
    { variant_size_pack_id: string; tag_name: string }[]
  >([]);
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [, setAtlasConfigs] = useState<Record<string, AtlasConfig>>({});

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [skuResponse, tagsResponse, variantTagsResponse] =
          await Promise.all([
            axios.get(
              `${import.meta.env.VITE_API_URL}${API_ENDPOINTS.SKU_MASTER}`
            ),
            axios.get(
              `${import.meta.env.VITE_API_URL}${API_ENDPOINTS.PRODUCT_TAGS}`
            ),
            axios.get(
              `${import.meta.env.VITE_API_URL}${
                API_ENDPOINTS.VARIANT_SIZE_PACK_TAGS
              }`
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

  // Transform data for hierarchical view
  const transformedData = useMemo(() => {
    const groupedData: ProductRowData[] = [];
    const sizePackMap = new Map<string, SKUData[]>();

    // Group SKUs by size pack
    data.forEach((sku) => {
      const key = sku.variant_size_pack_desc;
      if (!sizePackMap.has(key)) {
        sizePackMap.set(key, []);
      }
      sizePackMap.get(key)!.push(sku);
    });

    // Create size pack rows with active SKUs only
    sizePackMap.forEach((skus) => {
      const hasActiveSKU = skus.some((sku) => sku.sku_status === "A");
      if (!hasActiveSKU) return;

      const baseSKU = skus[0];
      const activeSKUs = skus.filter((sku) => sku.sku_status === "A");

      // Add tags to the size pack
      const tags = variantSizePackTags
        .filter(
          (tag) => tag.variant_size_pack_id === baseSKU.variant_size_pack_id
        )
        .map((tag) => ({ tag_id: tag.tag_id, tag_name: tag.tag_name }));

      const sizePackRow: ProductRowData = {
        ...baseSKU,
        isSizePack: true,
        isExpanded: expandedSizePacks.has(baseSKU.variant_size_pack_id),
        childSKUs: skus,
        activeSKUCount: activeSKUs.length,
        inactiveSKUCount: skus.length - activeSKUs.length,
        tags,
      };

      groupedData.push(sizePackRow);

      // Add child SKUs if expanded
      if (expandedSizePacks.has(baseSKU.variant_size_pack_id)) {
        skus.forEach((sku) => {
          groupedData.push({ ...sku, isSizePack: false });
        });
      }
    });

    return groupedData;
  }, [data, expandedSizePacks, variantSizePackTags]);

  // Column definitions
  const columns: Column[] = useMemo(
    () => [
      {
        key: "expand",
        header: "",
        width: 24,
        align: "left",
        render: (_, row) => (
          <Box
            sx={{ position: "relative", width: "100%", minHeight: "24px" }}
            data-is-sku-row={!row.isSizePack}
          >
            {row.isSizePack && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const newExpanded = new Set(expandedSizePacks);
                  if (expandedSizePacks.has(row.variant_size_pack_id)) {
                    newExpanded.delete(row.variant_size_pack_id);
                  } else {
                    newExpanded.add(row.variant_size_pack_id);
                  }
                  setExpandedSizePacks(newExpanded);
                }}
                sx={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  p: 0.25,
                }}
              >
                {row.isExpanded ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            )}
          </Box>
        ),
        sortable: false,
      },
      {
        key: "brand",
        header: "Brand",
        width: 80,
        align: "left",
        render: (value) => <Typography variant="body2">{value}</Typography>,
        sortable: true,
        filterable: true,
      },
      {
        key: "variant_size_pack_desc",
        header: "Size Pack",
        width: 200,
        align: "left",
        render: (value, row) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" sx={{ flexShrink: 0 }}>
              {value}
            </Typography>
            {row.isSizePack && row.tags?.length > 0 && (
              <>
                {row.tags
                  .filter((tag: ProductTag) => tag.tag_name?.trim())
                  .map((tag: ProductTag) => (
                    <Chip
                      key={tag.tag_id}
                      label={tag.tag_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: "20px",
                        fontSize: "0.7rem",
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  ))}
              </>
            )}
          </Box>
        ),
        sortable: true,
        filterable: true,
        tagFilterable: true,
        getTagOptions: () => {
          const tagSet = new Set<string>();
          transformedData.forEach((row) => {
            if (row.isSizePack && row.tags) {
              row.tags.forEach((tag) => {
                if (tag.tag_name?.trim()) tagSet.add(tag.tag_name);
              });
            }
          });
          return Array.from(tagSet).sort();
        },
        getRowTags: (row: ProductRowData) => {
          if (!row.isSizePack || !row.tags) return [];
          return row.tags
            .filter((tag) => tag.tag_name?.trim())
            .map((tag) => tag.tag_name);
        },
      },
      {
        key: "sku_description",
        header: "SKU Description",
        width: 250,
        align: "left",
        render: (value, row) =>
          row.isSizePack ? (
            ""
          ) : (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body2">{value}</Typography>
              <IntegrationIndicator sku={row} />
            </Box>
          ),
        sortable: true,
        filterable: true,
      },
      {
        key: "activation_date",
        header: "Active Date",
        width: 100,
        align: "left",
        render: (value, row) =>
          row.isSizePack ? (
            ""
          ) : (
            <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
              {value ? new Date(value).toLocaleDateString() : "-"}
            </Typography>
          ),
        sortable: true,
        filterable: true,
        sortAccessor: (row: ProductRowData) =>
          row.isSizePack
            ? null
            : row.activation_date
            ? new Date(row.activation_date).getTime()
            : 0,
      },
      {
        key: "deactivation_date",
        header: "Deactive Date",
        width: 100,
        align: "left",
        render: (value, row) =>
          row.isSizePack ? (
            ""
          ) : (
            <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
              {value ? new Date(value).toLocaleDateString() : "-"}
            </Typography>
          ),
        sortable: true,
        filterable: true,
        sortAccessor: (row: ProductRowData) =>
          row.isSizePack
            ? null
            : row.deactivation_date
            ? new Date(row.deactivation_date).getTime()
            : 0,
      },
    ],
    [expandedSizePacks, transformedData]
  );

  // Event handlers
  const handleRowClick = (row: ProductRowData) => {
    setSelectedItem(row);
    setSelectionType(row.isSizePack ? "size_pack" : "sku");
    setSidebarOpen(true);

    if (row.isSizePack) {
      const initialTagNames = (row.tags || [])
        .map((tag) => tag.tag_name)
        .sort();
      setInitialTags(initialTagNames);
      setPendingTagChanges([]);
    } else {
      setInitialTags([]);
      setPendingTagChanges([]);
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    setSidebarOpen(false);
    setInitialTags([]);
    setPendingTagChanges([]);
  };

  const handleSaveTags = async () => {
    if (!selectedItem || selectionType !== "size_pack") return;

    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedItem.variant_size_pack_id
      )
      .map((change) => change.tag_name);

    const payload = [
      {
        variant_size_pack_id: selectedItem.variant_size_pack_id,
        tag_names: pendingTags,
      },
    ];

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}${API_ENDPOINTS.UPDATE_TAGS}`,
        { tags: payload }
      );

      // Refresh data
      const [tagsResponse, variantTagsResponse] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_URL}${API_ENDPOINTS.PRODUCT_TAGS}`
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL}${
            API_ENDPOINTS.VARIANT_SIZE_PACK_TAGS
          }`
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

  const handleSaveSKU = async () => {
    if (!selectedItem || selectionType !== "sku") return;

    try {
      // TODO: Implement SKU save functionality
      console.log("Save SKU changes:", selectedItem);
      setSnackbarOpen(true);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error saving SKU:", error);
    }
  };

  const handleCreateNewTag = () => {
    if (!newTagName.trim()) return;

    if (
      productTags.some(
        (tag) => tag.tag_name.toLowerCase() === newTagName.toLowerCase()
      )
    ) {
      alert("This tag already exists");
      return;
    }

    if (selectedItem && selectionType === "size_pack") {
      setPendingTagChanges((prev) => [
        ...prev,
        {
          variant_size_pack_id: selectedItem.variant_size_pack_id,
          tag_name: newTagName,
        },
      ]);
    }

    setNewTagDialogOpen(false);
    setNewTagName("");
  };

  // Helper functions
  const dedupeTags = (tags: { tag_id: number; tag_name: string }[]) => {
    const seen = new Set();
    return tags.filter((tag) => {
      if (!tag.tag_name?.trim()) return false;
      if (seen.has(tag.tag_name)) return false;
      seen.add(tag.tag_name);
      return true;
    });
  };

  const areArraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((val, index) => val === b[index]);

  const hasPendingChanges = () => {
    if (!selectedItem || selectionType !== "size_pack") return false;
    const skuTags = selectedItem.tags || [];
    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedItem.variant_size_pack_id
      )
      .map((change) => ({ tag_id: -2, tag_name: change.tag_name }));
    const allTags = [...skuTags, ...pendingTags];
    const currentTags = dedupeTags(allTags)
      .map((tag) => tag.tag_name)
      .sort();
    return !areArraysEqual(initialTags, currentTags);
  };

  const hasSKUChanges = () => {
    // Placeholder - will be updated when save functionality is implemented
    return selectedItem && selectionType === "sku";
  };

  const handleRemoveTag = (tagToRemove: ProductTag) => {
    if (!selectedItem || selectionType !== "size_pack") return;

    const currentTags = selectedItem.tags || [];
    const pendingTags = pendingTagChanges
      .filter(
        (change) =>
          change.variant_size_pack_id === selectedItem.variant_size_pack_id
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
          change.variant_size_pack_id !== selectedItem.variant_size_pack_id
      );
      return [
        ...filteredPrev,
        ...newTags.map((tag) => ({
          variant_size_pack_id: selectedItem.variant_size_pack_id,
          tag_name: tag.tag_name,
        })),
      ];
    });

    setSelectedItem((prev) =>
      prev ? { ...prev, tags: newTags as ProductTag[] } : null
    );
  };

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      {loading ? (
        <LoadingProgress onComplete={() => setLoading(false)} />
      ) : (
        <>
          <Box
            sx={{
              "& .MuiTableRow-root:not(.MuiTableRow-head)": {
                "&:has([data-is-sku-row='true'])": {
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  "&:hover": { backgroundColor: "rgba(25, 118, 210, 0.08)" },
                },
                "&:has([data-is-sku-row='false'])": {
                  backgroundColor: "transparent",
                  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                },
              },
            }}
          >
            <DynamicTable
              data={transformedData}
              columns={columns}
              getRowId={(row) =>
                row.isSizePack
                  ? `sp_${row.variant_size_pack_id}`
                  : `sku_${row.sku_id}`
              }
              defaultRowsPerPage={20}
              rowsPerPageOptions={[20, 50, 100]}
              onRowClick={handleRowClick}
              enableColumnFiltering
            />
          </Box>

          {/* Context-Aware Sidebar */}
          <QualSidebar
            open={sidebarOpen}
            onClose={handleClose}
            title={
              selectionType === "size_pack"
                ? "Size Pack Details"
                : "SKU Details"
            }
            width="500px"
            footerButtons={[
              {
                label: selectionType === "sku" ? "Close" : "Cancel",
                onClick: handleClose,
                variant: "outlined",
              },
              ...(selectionType === "size_pack" && hasPendingChanges()
                ? [
                    {
                      label: "Save Changes",
                      onClick: handleSaveTags,
                      variant: "contained" as const,
                      color: "primary" as const,
                    },
                  ]
                : []),
              ...(selectionType === "sku" && hasSKUChanges()
                ? [
                    {
                      label: "Save Changes",
                      onClick: handleSaveSKU,
                      variant: "contained" as const,
                      color: "primary" as const,
                    },
                  ]
                : []),
            ]}
          >
            <Box sx={{ p: 3 }}>
              <Stack spacing={4}>
                {/* Basic Information */}
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
                      value={selectedItem?.brand || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Variant"
                      value={selectedItem?.variant || ""}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Size Pack"
                      value={selectedItem?.variant_size_pack_desc || ""}
                      disabled
                    />
                    {selectionType === "sku" && (
                      <>
                        <TextField
                          fullWidth
                          label="SKU ID"
                          value={selectedItem?.sku_id || ""}
                          disabled
                        />
                        <TextField
                          fullWidth
                          label="SKU Name"
                          value={selectedItem?.sku_description || ""}
                          disabled
                        />
                      </>
                    )}
                  </Stack>
                </Box>

                {/* Size Pack Tags */}
                {selectionType === "size_pack" && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{ mb: 2 }}
                    >
                      Product Tags
                    </Typography>
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
                        const skuTags = selectedItem?.tags || [];
                        const pendingTags = pendingTagChanges
                          .filter(
                            (change) =>
                              change.variant_size_pack_id ===
                              selectedItem?.variant_size_pack_id
                          )
                          .map((change) => ({
                            tag_id: -2,
                            tag_name: change.tag_name,
                          }));
                        return dedupeTags([
                          ...skuTags,
                          ...pendingTags,
                        ]) as ProductTag[];
                      })()}
                      onChange={(_, newValue) => {
                        if (!selectedItem) return;
                        if (newValue.some((tag) => tag.tag_id === -1)) {
                          setNewTagDialogOpen(true);
                          return;
                        }
                        const validTags = newValue.filter((tag) =>
                          productTags.some((pt) => pt.tag_name === tag.tag_name)
                        );
                        setPendingTagChanges((prev) => [
                          ...prev.filter(
                            (change) =>
                              change.variant_size_pack_id !==
                              selectedItem.variant_size_pack_id
                          ),
                          ...validTags.map((tag) => ({
                            variant_size_pack_id:
                              selectedItem.variant_size_pack_id,
                            tag_name: tag.tag_name,
                          })),
                        ]);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Product Tags" />
                      )}
                      renderTags={(value) =>
                        value.map((option) => (
                          <Chip
                            key={option.tag_id}
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
                  </Box>
                )}

                {/* SKU Third-Party Mappings */}
                {selectionType === "sku" && (
                  <>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        sx={{ mb: 2 }}
                      >
                        Third-Party Mappings
                      </Typography>
                      <Stack spacing={2}>
                        {THIRD_PARTY_INTEGRATIONS.map((integration) => (
                          <TextField
                            key={integration.key}
                            fullWidth
                            label={`${integration.name} Name`}
                            value={selectedItem?.[integration.key] || ""}
                            onChange={(e) =>
                              setSelectedItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      [integration.key]: e.target.value,
                                    }
                                  : prev
                              )
                            }
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Box>

                    {/* SKU Lifecycle */}
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        sx={{ mb: 2 }}
                      >
                        Product Lifecycle
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="Active Date"
                          type="date"
                          value={
                            selectedItem?.activation_date
                              ? selectedItem.activation_date.split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setSelectedItem((prev) =>
                              prev
                                ? { ...prev, activation_date: e.target.value }
                                : prev
                            )
                          }
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />
                        <TextField
                          fullWidth
                          label="Deactive Date"
                          type="date"
                          value={
                            selectedItem?.deactivation_date
                              ? selectedItem.deactivation_date.split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setSelectedItem((prev) =>
                              prev
                                ? { ...prev, deactivation_date: e.target.value }
                                : prev
                            )
                          }
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />
                      </Stack>
                    </Box>
                  </>
                )}

                {/* Active SKUs Summary */}
                {selectionType === "size_pack" && selectedItem?.childSKUs && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{ mb: 2 }}
                    >
                      Active SKUs ({selectedItem.activeSKUCount})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedItem.childSKUs
                        .filter((sku) => sku.sku_status === "A")
                        .map((sku) => (
                          <Chip
                            key={sku.sku_id}
                            label={`${sku.sku_id} - ${sku.sku_description}`}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        ))}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          </QualSidebar>

          {/* ATLAS Launch Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<ShareIcon fontSize="small" />}
            onClick={() => setStagingDialogOpen(true)}
            sx={{ position: "absolute", bottom: 16, left: 16, borderRadius: 1 }}
          >
            Launch ATLAS
          </Button>

          {/* Dialogs */}
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

          <StagingDialog
            open={stagingDialogOpen}
            onClose={() => setStagingDialogOpen(false)}
            thirdPartyKeys={["jenda", "nielsen", "nabca", "vistaar"]}
            onSave={(configs) => {
              setAtlasConfigs(configs);
              setStagingDialogOpen(false);
            }}
          />

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
