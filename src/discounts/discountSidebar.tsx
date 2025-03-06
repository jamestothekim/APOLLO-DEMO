import {
  Drawer,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";

interface MonthData {
  value: number;
  isManuallyModified?: boolean;
  isActual: boolean;
}

interface DiscountData {
  id: string;
  key: string;
  months: {
    [key: string]: MonthData;
  };
  total: number;
  commentary?: string;
}

interface DiscountSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: DiscountData;
  onSave: (data: DiscountData) => void;
}

export const DiscountSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
}: DiscountSidebarProps) => {
  const [editedData, setEditedData] = useState<DiscountData | undefined>(
    undefined
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedData(selectedData);
    setHasChanges(false);
  }, [selectedData]);

  if (!editedData) return null;

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numValue)) return;

    setEditedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: {
            value: numValue,
            isManuallyModified: true,
            isActual: month === "JAN",
          },
        },
      };
    });
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months).reduce(
      (acc, curr) => acc + curr.value,
      0
    );
  };

  const handleSave = () => {
    if (editedData) {
      const updatedData = {
        ...editedData,
        total: calculateTotal(),
      };
      onSave(updatedData);
      setHasChanges(false);
    }
  };

  // Helper function to group months by quarter
  const quarterGroups = [
    { label: "Q1", months: ["JAN", "FEB", "MAR"] },
    { label: "Q2", months: ["APR", "MAY", "JUN"] },
    { label: "Q3", months: ["JUL", "AUG", "SEP"] },
    { label: "Q4", months: ["OCT", "NOV", "DEC"] },
  ];

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
          <Typography variant="h6">Discount Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Variant:</Typography>
              <Typography>{editedData.key}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ mb: 2, fontWeight: 700 }}>
              Monthly Discount Values:
            </Typography>
            {quarterGroups.map(({ label, months }) => (
              <Box key={label} sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    mb: 1,
                    color: "text.secondary",
                    fontWeight: 700,
                  }}
                >
                  {label}
                </Typography>
                <Grid container spacing={2}>
                  {months.map((month) => (
                    <Grid item xs={4} key={month}>
                      <TextField
                        label={month}
                        value={`$${editedData.months[
                          month
                        ]?.value.toLocaleString()}`}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(
                            /[^0-9.-]+/g,
                            ""
                          );
                          handleMonthValueChange(month, rawValue);
                        }}
                        size="small"
                        fullWidth
                        disabled={editedData.months[month]?.isActual}
                        InputProps={{
                          endAdornment: editedData.months[month]
                            ?.isManuallyModified ? (
                            <EditIcon
                              fontSize="small"
                              sx={{
                                color: (theme) => theme.palette.secondary.main,
                              }}
                            />
                          ) : null,
                          sx: {
                            "& .MuiInputBase-input": {
                              color: editedData.months[month]
                                ?.isManuallyModified
                                ? (theme) => theme.palette.secondary.main
                                : editedData.months[month]?.isActual
                                ? (theme) => theme.palette.primary.main
                                : "inherit",
                            },
                          },
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Commentary"
              multiline
              rows={3}
              fullWidth
              value={editedData.commentary || ""}
              onChange={(e) => {
                setEditedData((prev) =>
                  prev ? { ...prev, commentary: e.target.value } : prev
                );
                setHasChanges(true);
              }}
              placeholder="Add your comments here..."
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Total Discount:</Typography>
              <Typography variant="h6">
                ${calculateTotal().toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
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
