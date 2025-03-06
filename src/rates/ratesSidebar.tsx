import {
  Drawer,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { RateData } from "../data/data";

interface RatesSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: RateData;
  onSave: (data: RateData) => void;
}

export const RatesSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
}: RatesSidebarProps) => {
  const [editedData, setEditedData] = useState<RateData | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedData(selectedData);
    setHasChanges(false);
  }, [selectedData]);

  if (!editedData) return null;

  const handleSave = () => {
    if (editedData) {
      onSave(editedData);
      setHasChanges(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: "600px",
          backgroundColor: "background.paper",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ p: 3, flex: 1, overflow: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6">Rate Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>SKU ID:</Typography>
            <Typography>{editedData.skuId}</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>SKU Name:</Typography>
            <Typography>{editedData.skuName}</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              COGS (PHYS):
            </Typography>
            <TextField
              value={editedData.cogs}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setEditedData((prev) =>
                    prev ? { ...prev, cogs: value } : prev
                  );
                  setHasChanges(true);
                }
              }}
              type="number"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <Typography>$</Typography>,
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>RPC (PHYS):</Typography>
            <TextField
              value={editedData.rpc}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setEditedData((prev) =>
                    prev ? { ...prev, rpc: value } : prev
                  );
                  setHasChanges(true);
                }
              }}
              type="number"
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <Typography>$</Typography>,
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Commentary:</Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              value={editedData?.commentary || ""}
              onChange={(e) => {
                setEditedData((prev) =>
                  prev ? { ...prev, commentary: e.target.value } : prev
                );
                setHasChanges(true);
              }}
              placeholder="Add your comments here..."
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          backgroundColor: (theme) => theme.palette.background.paper,
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ minWidth: "120px" }}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges}
          sx={{ minWidth: "120px" }}
        >
          Save Changes
        </Button>
      </Box>
    </Drawer>
  );
};
