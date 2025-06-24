import {
  Stack,
  Button,
  Typography,
  TextField,
  MenuItem,
  Box,
} from "@mui/material";
import dayjs from "dayjs";
import { syncMaster } from "../syncMaster";

export interface FrequencyConfig {
  startDate: string; // YYYY-MM-DD
  time: string; // HH:mm
  cadence: "Daily" | "Weekly" | "Monthly";
}

interface DataFrequencyProps {
  system: string;
  config: syncMaster;
  onBack: () => void;
  onSave: () => void;
  onFieldChange: (fieldPath: string[], value: any) => void;
}

export const DataFrequency = ({
  system,
  config,
  onBack,
  onSave,
  onFieldChange,
}: DataFrequencyProps) => {
  const freq = config.frequency || {
    startDate: dayjs().format("YYYY-MM-DD"),
    time: "00:00",
    cadence: "Daily" as const,
  };

  const handleChange = (field: keyof FrequencyConfig, value: any) => {
    onFieldChange(["frequency", field], value);
  };

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Typography variant="h6">Feed Frequency – {system}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          label="Start Date"
          type="date"
          value={freq.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Time"
          type="time"
          value={freq.time}
          onChange={(e) => handleChange("time", e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Cadence"
          value={freq.cadence}
          onChange={(e) => handleChange("cadence", e.target.value)}
          size="small"
          sx={{ width: 200 }}
        >
          {[
            { label: "Daily", value: "Daily" },
            { label: "Weekly", value: "Weekly" },
            { label: "Monthly", value: "Monthly" },
          ].map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {/* Sticky footer */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          mb: 0,
        }}
      >
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onSave}>
          Save
        </Button>
      </Box>
    </Stack>
  );
};
