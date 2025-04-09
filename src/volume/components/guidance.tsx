import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Autocomplete,
  TextField,
  Chip,
} from "@mui/material";
import axios from "axios";
import { useUser } from "../../userContext";

export interface Guidance {
  id: number;
  label: string;
  sublabel?: string;
  value:
    | string
    | {
        numerator?: string;
        denominator?: string;
        expression?: string;
      };
  calculation: {
    type: "direct" | "percentage" | "difference";
    format?: "number" | "percent";
  };
}

interface GuidanceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  type: "columns";
  onApply: (selectedGuidance: Guidance[]) => void;
}

export const GuidanceDialog: React.FC<GuidanceDialogProps> = ({
  open,
  onClose,
  title,
  type,
  onApply,
}) => {
  const { user, saveGuidancePreferences } = useUser();
  const [benchmarks, setGuidance] = useState<Guidance[]>([]);
  const [selectedGuidance, setSelectedGuidance] = useState<Guidance[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all available benchmarks
  useEffect(() => {
    if (open) {
      fetchGuidance();
    }
  }, [open]);

  // Load user's benchmark preferences when dialog opens
  useEffect(() => {
    if (open && user?.user_settings?.benchmarks && benchmarks.length > 0) {
      loadUserGuidancePreferences();
    }
  }, [open, user?.user_settings?.benchmarks, benchmarks]);

  const fetchGuidance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-benchmarks`
      );
      setGuidance(response.data);
    } catch (error) {
      console.error("Error fetching benchmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load user's benchmark preferences
  const loadUserGuidancePreferences = () => {
    if (!user?.user_settings?.benchmarks || benchmarks.length === 0) return;

    // Sort benchmark preferences by order
    const sortedPreferences = [...user.user_settings.benchmarks].sort(
      (a, b) => a.order - b.order
    );

    // Map preference IDs to actual benchmark objects
    const userSelectedGuidance = sortedPreferences
      .map((pref) => benchmarks.find((b) => b.id === pref.id))
      .filter(Boolean) as Guidance[];

    if (userSelectedGuidance.length > 0) {
      setSelectedGuidance(userSelectedGuidance);
    }
  };

  const handleApply = async () => {
    console.log(`Selected ${type}:`, selectedGuidance);

    // Apply benchmark selection
    onApply(selectedGuidance);

    // Save benchmark preferences if we have a logged-in user
    if (user) {
      try {
        // Extract benchmark IDs in the current order
        const benchmarkIds = selectedGuidance.map((benchmark) => benchmark.id);
        await saveGuidancePreferences(benchmarkIds);
      } catch (error) {
        console.error("Error saving benchmark preferences:", error);
      }
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Autocomplete
            multiple
            options={benchmarks}
            getOptionLabel={(option) =>
              option.sublabel
                ? `${option.label}: ${option.sublabel}`
                : option.label
            }
            value={selectedGuidance}
            onChange={(_, newValue) => setSelectedGuidance(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Guidance"
                placeholder={
                  selectedGuidance.length === 0 ? "Search benchmarks..." : ""
                }
                size="small"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...otherProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    {...otherProps}
                    label={
                      option.sublabel
                        ? `${option.label}: ${option.sublabel}`
                        : option.label
                    }
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                      borderRadius: "16px",
                      backgroundColor: "transparent",
                      border: "1px solid",
                      borderColor: "primary.main",
                      color: "primary.main",
                      "& .MuiChip-label": {
                        px: 1,
                      },
                    }}
                  />
                );
              })
            }
            loading={loading}
            loadingText="Loading benchmarks..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};
