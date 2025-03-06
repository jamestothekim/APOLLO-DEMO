import { useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { SKU_MASTER_DATA, SKUMasterData } from "../../data/data";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";

export const SKUMaster = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<SKUMasterData | null>(null);
  const [data, setData] = useState(SKU_MASTER_DATA);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSKU, setNewSKU] = useState<Partial<SKUMasterData>>({});

  const handleEdit = (row: SKUMasterData) => {
    setEditingId(row.sku_id);
    setEditData({ ...row });
  };

  const handleSave = () => {
    if (editData) {
      setData(data.map((row) => (row.sku_id === editingId ? editData : row)));
      setEditingId(null);
      setEditData(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleDelete = (skuId: string) => {
    setData(data.filter((row) => row.sku_id !== skuId));
    setEditingId(null);
    setEditData(null);
  };

  const handleChange = (field: keyof SKUMasterData, value: string) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const handleNewSKUChange = (field: keyof SKUMasterData, value: string) => {
    setNewSKU((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSKU = () => {
    if (newSKU.sku_id && newSKU.sku_desc) {
      setData([...data, newSKU as SKUMasterData]);
      setOpenDialog(false);
      setNewSKU({});
    }
  };

  const renderEditableCell = (
    value: string,
    field: keyof SKUMasterData,
    row: SKUMasterData
  ) => {
    if (editingId === row.sku_id) {
      return (
        <TextField
          size="small"
          value={editData?.[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          fullWidth
        />
      );
    }
    return value;
  };

  const columns: Column[] = [
    {
      key: "sku_id",
      header: "SKU ID",
      render: (value, row) => renderEditableCell(value, "sku_id", row),
    },
    {
      key: "sku_desc",
      header: "SKU Description",
      render: (value, row) => renderEditableCell(value, "sku_desc", row),
    },
    {
      key: "brand_name",
      header: "Brand",
      render: (value, row) => renderEditableCell(value, "brand_name", row),
    },
    {
      key: "brand_variant_name",
      header: "Brand Variant",
      render: (value, row) =>
        renderEditableCell(value, "brand_variant_name", row),
    },
    {
      key: "size_pack_desc",
      header: "Size Pack",
      render: (value, row) => renderEditableCell(value, "size_pack_desc", row),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) =>
        editingId === row.sku_id ? (
          <Box>
            <IconButton size="small" onClick={handleSave} color="primary">
              <SaveIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.sku_id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
            <IconButton size="small" onClick={handleCancel}>
              <CancelIcon />
            </IconButton>
          </Box>
        ) : (
          <IconButton size="small" onClick={() => handleEdit(row)}>
            <EditIcon />
          </IconButton>
        ),
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.sku_id}
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 25, 100]}
      />

      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 0,
          zIndex: 1,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add SKU
        </Button>
      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New SKU</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SKU ID"
                value={newSKU.sku_id || ""}
                onChange={(e) => handleNewSKUChange("sku_id", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SKU Description"
                value={newSKU.sku_desc || ""}
                onChange={(e) => handleNewSKUChange("sku_desc", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Brand"
                value={newSKU.brand_name || ""}
                onChange={(e) =>
                  handleNewSKUChange("brand_name", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Brand Variant"
                value={newSKU.brand_variant_name || ""}
                onChange={(e) =>
                  handleNewSKUChange("brand_variant_name", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Size Pack"
                value={newSKU.size_pack_desc || ""}
                onChange={(e) =>
                  handleNewSKUChange("size_pack_desc", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddSKU} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
