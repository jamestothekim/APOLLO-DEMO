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
  Popover,
  Chip,
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
  const [newProductNames, setNewProductNames] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
        <Typography
          variant="subtitle2"
          sx={{ flexGrow: 1, textAlign: "center" }}
        >
          PRODUCTS
        </Typography>
        {!readOnly && (
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              setAddingProduct(true);
              setAnchorEl(e.currentTarget);
            }}
          >
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />
      <Popover
        open={addingProduct && !readOnly}
        anchorEl={anchorEl}
        onClose={() => {
          setAddingProduct(false);
          setNewProductNames([]);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            p: 1.5,
            display: "flex",
            alignItems: "center",
            borderRadius: 2,
            boxShadow: 4,
            minWidth: 370,
            maxWidth: 370,
            ml: "-334px",
          },
        }}
      >
        <Autocomplete
          multiple
          options={productNames}
          value={newProductNames}
          onChange={(_e, v) => setNewProductNames(v as string[])}
          disableCloseOnSelect
          disableClearable
          renderTags={(value, getTagProps) =>
            value.length <= 1 ? (
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} />
              ))
            ) : (
              <Chip
                label={`${value.length} Products`}
                size="small"
                {...getTagProps({ index: 0 })}
              />
            )
          }
          renderInput={(params) => (
            <TextField {...params} size="small" label="Product" fullWidth />
          )}
          fullWidth
          sx={{ flex: 1, mr: 1 }}
        />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            color="success"
            disabled={newProductNames.length === 0}
            onClick={() => {
              if (newProductNames.length === 0) return;
              setProducts((prev) => {
                const existing = new Set(prev.map((p) => p.name));
                const toAdd = newProductNames.filter((n) => !existing.has(n));
                const upd = [
                  ...prev,
                  ...toAdd.map((n) => ({
                    name: n,
                    scans: [],
                    growthRate: 0,
                    nielsenTrend: undefined,
                  })),
                ];
                setSelectedProductIdx(upd.length - 1);
                return upd;
              });
              setNewProductNames([]);
              setAddingProduct(false);
            }}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setAddingProduct(false);
              setNewProductNames([]);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Popover>
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
