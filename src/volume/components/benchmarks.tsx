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

export interface Benchmark {
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

interface BenchmarksDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  type: "columns" | "rows";
  onApply: (selectedBenchmarks: Benchmark[]) => void;
}

export const BenchmarksDialog: React.FC<BenchmarksDialogProps> = ({
  open,
  onClose,
  title,
  type,
  onApply,
}) => {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBenchmarks();
    }
  }, [open]);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-benchmarks`
      );
      setBenchmarks(response.data);
    } catch (error) {
      console.error("Error fetching benchmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    console.log(`Selected ${type}:`, selectedBenchmarks);
    onApply(selectedBenchmarks);
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
            value={selectedBenchmarks}
            onChange={(_, newValue) => setSelectedBenchmarks(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Benchmarks"
                placeholder="Search benchmarks..."
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
          Add {type === "columns" ? "Columns" : "Rows"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
