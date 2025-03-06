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
import { CUSTOMER_MASTER_DATA, CustomerMasterData } from "../../data/data";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";

export const CustomerMaster = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<CustomerMasterData | null>(null);
  const [data, setData] = useState(CUSTOMER_MASTER_DATA);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<CustomerMasterData>>(
    {}
  );

  const handleEdit = (row: CustomerMasterData) => {
    setEditingId(row.customer_id);
    setEditData({ ...row });
  };

  const handleSave = () => {
    if (editData) {
      setData(
        data.map((row) => (row.customer_id === editingId ? editData : row))
      );
      setEditingId(null);
      setEditData(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleDelete = (customerId: string) => {
    setData(data.filter((row) => row.customer_id !== customerId));
    setEditingId(null);
    setEditData(null);
  };

  const handleChange = (field: keyof CustomerMasterData, value: string) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const handleNewCustomerChange = (
    field: keyof CustomerMasterData,
    value: string
  ) => {
    setNewCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddCustomer = () => {
    if (newCustomer.customer_id && newCustomer.customer_name) {
      setData([...data, newCustomer as CustomerMasterData]);
      setOpenDialog(false);
      setNewCustomer({});
    }
  };

  const renderEditableCell = (
    value: string,
    field: keyof CustomerMasterData,
    row: CustomerMasterData
  ) => {
    if (editingId === row.customer_id) {
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
      key: "customer_id",
      header: "Customer ID",
      render: (value, row) => renderEditableCell(value, "customer_id", row),
    },
    {
      key: "customer_name",
      header: "Customer Name",
      render: (value, row) => renderEditableCell(value, "customer_name", row),
    },
    {
      key: "market_id",
      header: "Market ID",
      render: (value, row) => renderEditableCell(value, "market_id", row),
    },
    {
      key: "market_name",
      header: "Market Name",
      render: (value, row) => renderEditableCell(value, "market_name", row),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) =>
        editingId === row.customer_id ? (
          <Box>
            <IconButton size="small" onClick={handleSave} color="primary">
              <SaveIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.customer_id)}
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
        getRowId={(row) => row.customer_id}
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
          Add Customer
        </Button>
      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer ID"
                value={newCustomer.customer_id || ""}
                onChange={(e) =>
                  handleNewCustomerChange("customer_id", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={newCustomer.customer_name || ""}
                onChange={(e) =>
                  handleNewCustomerChange("customer_name", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Market ID"
                value={newCustomer.market_id || ""}
                onChange={(e) =>
                  handleNewCustomerChange("market_id", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Market Name"
                value={newCustomer.market_name || ""}
                onChange={(e) =>
                  handleNewCustomerChange("market_name", e.target.value)
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddCustomer}
            variant="contained"
            color="primary"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
