import React, { useState } from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  Autocomplete,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

export interface ProductEntry {
  name: string;
  scans: {
    week: string;
    scan: number;
    projectedScan?: number;
    projectedRetail?: number;
    qd?: number;
    retailerMargin?: number;
    loyalty?: number;
  }[];
  growthRate?: number;
  nielsenTrend?: { month: string; value: number }[];
}

interface ProductsPaneProps {
  products: ProductEntry[];
  setProducts: React.Dispatch<React.SetStateAction<ProductEntry[]>>;
  selectedProductIdx: number;
  setSelectedProductIdx: React.Dispatch<React.SetStateAction<number>>;
  productNames: string[];
  readOnly?: boolean;
}

const ScanSidebarProducts: React.FC<ProductsPaneProps> = ({
  products,
  setProducts,
  selectedProductIdx,
  setSelectedProductIdx,
  productNames,
  readOnly = false,
}) => {
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  return (
    <Paper
      sx={{
        width: "100%",
        p: 0,
        height: 220,
        maxHeight: 220,
        display: "flex",
        flexDirection: "column",
      }}
      variant="outlined"
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Products
        </Typography>
        {!readOnly && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => setAddingProduct(true)}
          >
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />
      {addingProduct && !readOnly && (
        <Box
          sx={{ px: 1, py: 1, display: "flex", alignItems: "center", gap: 1 }}
        >
          <Autocomplete
            options={productNames}
            value={newProductName || null}
            onChange={(_e, v) => setNewProductName(v || "")}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Product" fullWidth />
            )}
            fullWidth
          />
          <IconButton
            size="small"
            color="success"
            disabled={!newProductName}
            onClick={() => {
              if (!newProductName) return;
              setProducts((prev) => {
                const upd = [
                  ...prev,
                  {
                    name: newProductName,
                    scans: [],
                    growthRate: 0,
                    nielsenTrend: undefined,
                  },
                ];
                setSelectedProductIdx(upd.length - 1);
                return upd;
              });
              setNewProductName("");
              setAddingProduct(false);
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setAddingProduct(false);
              setNewProductName("");
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "60%" }}>Product</TableCell>
              <TableCell sx={{ width: "30%" }}># Scans</TableCell>
              <TableCell sx={{ width: "10%" }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((prod, i) => {
              const dashIdx = prod.name.indexOf(" - ");
              const displayName =
                dashIdx !== -1 ? prod.name.slice(dashIdx + 3) : prod.name;
              const isEditing = editingIdx === i;
              return (
                <TableRow
                  key={i}
                  hover
                  selected={i === selectedProductIdx}
                  onClick={() => {
                    setSelectedProductIdx(i);
                  }}
                  sx={{ cursor: "pointer", height: 44 }}
                >
                  <TableCell sx={{ width: "60%" }}>
                    {isEditing ? (
                      <Autocomplete
                        options={[...productNames, prod.name]}
                        value={editingName || null}
                        onChange={(_e, v) => setEditingName(v || "")}
                        renderInput={(params) => (
                          <TextField {...params} size="small" />
                        )}
                        fullWidth
                        autoHighlight
                      />
                    ) : (
                      displayName
                    )}
                  </TableCell>
                  <TableCell sx={{ width: "30%" }}>
                    {prod.scans.length}
                  </TableCell>
                  <TableCell sx={{ width: "10%" }} align="right">
                    {isEditing ? (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          disabled={!editingName}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!editingName) return;
                            setProducts((prev) =>
                              prev.map((p, idx) =>
                                idx === i ? { ...p, name: editingName } : p
                              )
                            );
                            setEditingIdx(null);
                            setEditingName("");
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIdx(null);
                            setEditingName("");
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : readOnly ? null : (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          justifyContent: "flex-end",
                        }}
                      >
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIdx(i);
                            setEditingName(prod.name);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProducts((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            );
                            if (selectedProductIdx === i) {
                              setSelectedProductIdx(0);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default ScanSidebarProducts;
