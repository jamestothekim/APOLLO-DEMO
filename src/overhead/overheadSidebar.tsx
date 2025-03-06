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
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface OverheadData {
  id: string;
  division: string;
  glCode: string;
  activity: string;
  commentary?: string;
  months: {
    [key: string]: MonthData;
  };
}

interface OverheadSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: OverheadData;
  onSave: (data: OverheadData) => void;
}

export const OverheadSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
}: OverheadSidebarProps) => {
  const [editedData, setEditedData] = useState<OverheadData | undefined>(
    undefined
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedData(selectedData);
    setHasChanges(false);
  }, [selectedData]);

  if (!editedData) return null;

  const handleMonthValueChange = (month: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setEditedData((prev: OverheadData | undefined) => {
      if (!prev) return prev;
      return {
        ...prev,
        months: {
          ...prev.months,
          [month]: {
            ...prev.months[month],
            value: numValue,
            isManuallyModified: true,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months).reduce(
      (acc, curr: MonthData) => acc + curr.value,
      0
    );
  };

  const handleSave = () => {
    if (editedData) {
      onSave(editedData);
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
          <Typography variant="h6">Overhead Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Division:</Typography>
              <Typography>{editedData.division}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>GL Code:</Typography>
              <Typography>{editedData.glCode}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Activity:</Typography>
              <Typography>{editedData.activity}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ mb: 2, fontWeight: 700 }}>
              Monthly Values:
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
                        value={editedData?.months[month].value.toLocaleString()}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, "");
                          handleMonthValueChange(month, rawValue);
                        }}
                        size="small"
                        fullWidth
                        InputProps={{
                          readOnly: editedData?.months[month].isActual,
                          endAdornment: editedData?.months[month]
                            .isManuallyModified ? (
                            <EditIcon
                              fontSize="small"
                              sx={{
                                color: (theme) => theme.palette.secondary.main,
                              }}
                            />
                          ) : null,
                          sx: {
                            "& .MuiInputBase-input": {
                              color: editedData?.months[month]
                                .isManuallyModified
                                ? (theme) => theme.palette.secondary.main
                                : editedData?.months[month].isActual
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
              <Typography sx={{ fontWeight: 700 }}>Total:</Typography>
              <Typography variant="h6">
                {calculateTotal().toLocaleString()}
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
