import {
  Drawer,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import type { MarketingData } from "./marketing";

const TYPE_OPTIONS = ["CMI", "Advertising", "Promotions"];
const PROGRAM_OPTIONS = [
  "POS",
  "Sampling",
  "Trade Event",
  "Incentive",
  "Window Display",
  "Storage",
  "Promo Giveback",
];

interface MarketingSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedData?: MarketingData;
  onSave: (data: MarketingData) => void;
}

export const MarketingSidebar = ({
  open,
  onClose,
  selectedData,
  onSave,
}: MarketingSidebarProps) => {
  const [editedData, setEditedData] = useState<MarketingData | undefined>(
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

    setEditedData((prev) => {
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

  const handleFieldChange = (
    field: keyof MarketingData,
    value: string | number
  ) => {
    setEditedData((prev) => (prev ? { ...prev, [field]: value } : prev));
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months).reduce(
      (acc, curr) => acc + curr.value,
      0
    );
  };

  const calculateSpent = () => {
    if (!editedData) return 0;
    return Object.values(editedData.months)
      .filter((month) => month.isActual)
      .reduce((acc, curr) => acc + curr.value, 0);
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
          <Typography variant="h6">Marketing Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700 }}>Brand Variant:</Typography>
              <Typography>{editedData.brandVariant}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="GL Account"
              value={editedData.glAccount}
              onChange={(e) => handleFieldChange("glAccount", e.target.value)}
              fullWidth
              inputProps={{
                pattern: "5[0-9]{4}",
                maxLength: 5,
              }}
              helperText="Must be 5 digits starting with 5"
            />
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={editedData.type}
                label="Type"
                onChange={(e) => handleFieldChange("type", e.target.value)}
              >
                {TYPE_OPTIONS.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Program</InputLabel>
              <Select
                value={editedData.programName}
                label="Program"
                onChange={(e) =>
                  handleFieldChange("programName", e.target.value)
                }
              >
                {PROGRAM_OPTIONS.map((program) => (
                  <MenuItem key={program} value={program}>
                    {program}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                              sx={{ color: "secondary.main" }}
                            />
                          ) : null,
                          sx: {
                            "& .MuiInputBase-input": {
                              color: editedData?.months[month]
                                .isManuallyModified
                                ? "secondary.main"
                                : editedData?.months[month].isActual
                                ? "primary.main"
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>Committed:</Typography>
                <Typography>{calculateTotal().toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>Spent:</Typography>
                <Typography>{calculateSpent().toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>Spend to Go:</Typography>
                <Typography>
                  {(calculateTotal() - calculateSpent()).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
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
