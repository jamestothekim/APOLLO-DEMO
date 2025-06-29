import React, { useMemo, useState, useCallback } from "react";
import {
  Box,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  DynamicTable,
  type Column,
} from "../../../reusableComponents/dynamicTable";

interface SKU {
  id: string;
  desc: string;
  brand?: string;
  [key: string]: any;
}

interface SKUConfiguration {
  leadTimeEdison: string;
  leadTimeScotland: string;
  leadTimeIreland: string;
  leadTimeMexico: string;
}

interface DefaultConfiguration {
  leadTimeEdison: string;
  leadTimeScotland: string;
  leadTimeIreland: string;
  leadTimeMexico: string;
  targetDOI: string;
}

interface LeadTimesProps {
  skus: SKU[];
  selectedMarket: string;
  defaultConfigurations: Record<string, DefaultConfiguration>;
  configurations: Record<string, SKUConfiguration>;
  onConfigurationChange: (
    skuId: string,
    field: keyof SKUConfiguration,
    value: string,
    selectedMarket: string
  ) => void;
  loading?: boolean;
}

const LEAD_TIME_FIELDS = [
  { key: "leadTimeEdison" as keyof SKUConfiguration, label: "Edison" },
  { key: "leadTimeScotland" as keyof SKUConfiguration, label: "Scotland" },
  { key: "leadTimeIreland" as keyof SKUConfiguration, label: "Ireland" },
  { key: "leadTimeMexico" as keyof SKUConfiguration, label: "Mexico" },
];

// Memoized Material-UI TextField component for lead time inputs
const LeadTimeInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = React.memo(({ value, onChange, placeholder }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Only allow digits
      if (inputValue === "" || /^\d+$/.test(inputValue)) {
        onChange(inputValue);
      }
    },
    [onChange]
  );

  return (
    <TextField
      size="small"
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      sx={{
        width: 60,
        "& .MuiInputBase-input": {
          fontSize: "0.875rem",
          textAlign: "center",
          px: 1,
          py: 0.5,
        },
        "& .MuiOutlinedInput-root": {
          minHeight: "auto",
        },
      }}
    />
  );
});

export const LeadTimes: React.FC<LeadTimesProps> = ({
  skus,
  selectedMarket,
  defaultConfigurations,
  configurations,
  onConfigurationChange,
  loading = false,
}) => {
  // Track which rows are in edit mode
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());

  // Track temporary values for rows being edited
  const [tempValues, setTempValues] = useState<
    Record<string, SKUConfiguration>
  >({});

  // Transform SKU data for DynamicTable
  const tableData = useMemo(() => {
    return skus.map((sku) => ({
      ...sku,
    }));
  }, [skus]);

  // Handle entering edit mode
  const handleEditRow = useCallback(
    (skuId: string) => {
      if (!selectedMarket) return;

      const configKey = `${selectedMarket}-${skuId}`;
      const config = configurations[configKey];
      const defaults = defaultConfigurations[skuId];

      // Use existing config or default to the defaults from DefaultConfig
      const currentConfig = config || {
        leadTimeEdison: defaults?.leadTimeEdison || "30",
        leadTimeScotland: defaults?.leadTimeScotland || "30",
        leadTimeIreland: defaults?.leadTimeIreland || "30",
        leadTimeMexico: defaults?.leadTimeMexico || "30",
      };

      // Initialize temp values with current config
      setTempValues((prev) => ({
        ...prev,
        [skuId]: { ...currentConfig },
      }));

      setEditingRows((prev) => new Set([...prev, skuId]));
    },
    [selectedMarket, configurations, defaultConfigurations]
  );

  // Handle saving edited row
  const handleSaveRow = useCallback(
    (skuId: string) => {
      if (!selectedMarket) return;

      const temp = tempValues[skuId];
      if (temp && onConfigurationChange) {
        // Save all field values
        Object.entries(temp).forEach(([field, value]) => {
          onConfigurationChange(
            skuId,
            field as keyof SKUConfiguration,
            value,
            selectedMarket
          );
        });
      }

      // Exit edit mode
      setEditingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(skuId);
        return newSet;
      });

      // Clear temp values
      setTempValues((prev) => {
        const { [skuId]: removed, ...rest } = prev;
        return rest;
      });
    },
    [selectedMarket, tempValues, onConfigurationChange]
  );

  // Handle canceling edit
  const handleCancelEdit = useCallback((skuId: string) => {
    setEditingRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(skuId);
      return newSet;
    });

    setTempValues((prev) => {
      const { [skuId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Handle temp value changes
  const handleTempValueChange = useCallback(
    (skuId: string, field: keyof SKUConfiguration, value: string) => {
      setTempValues((prev) => ({
        ...prev,
        [skuId]: {
          ...prev[skuId],
          [field]: value,
        },
      }));
    },
    []
  );

  // Define columns with edit-on-demand functionality
  const columns: Column[] = useMemo(() => {
    const cellPaddingSx = { py: "6px", px: "8px" };

    const baseColumns: Column[] = [
      {
        key: "id",
        header: "SKU ID",
        align: "left" as const,
        sortable: true,
        filterable: true,
        width: 100,
        sx: cellPaddingSx,
        render: (value: string) => value,
      },
      {
        key: "brand",
        header: "Brand",
        align: "left" as const,
        sortable: true,
        filterable: true,
        width: 130,
        sx: cellPaddingSx,
        render: (value: string) => value || "-",
      },
      {
        key: "desc",
        header: "SKU Description",
        align: "left" as const,
        sortable: true,
        filterable: true,
        extraWide: true,
        sx: cellPaddingSx,
        render: (value: string) => value,
      },
    ];

    // Lead time columns with edit-on-demand
    const leadTimeColumns: Column[] = LEAD_TIME_FIELDS.map(
      ({ key, label }) => ({
        key,
        header: label,
        subHeader: "Days",
        align: "center" as const,
        sortable: true,
        filterable: true,
        width: 90,
        sx: cellPaddingSx,
        render: (_value: string, row: any) => {
          const isEditing = editingRows.has(row.id);

          if (isEditing) {
            // Show Material-UI TextField in edit mode
            const tempValue = tempValues[row.id]?.[key] || "";
            return (
              <LeadTimeInput
                value={tempValue}
                onChange={(value) => handleTempValueChange(row.id, key, value)}
                placeholder="0"
              />
            );
          } else {
            // Show static Typography in view mode
            if (!selectedMarket) return "-";

            const configKey = `${selectedMarket}-${row.id}`;
            const config = configurations[configKey] || {};
            const defaults = defaultConfigurations[row.id] || {};
            const currentValue = config[key] || defaults[key] || "30";

            return (
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  color: "text.secondary",
                  fontSize: "0.875rem",
                  fontWeight: "300",
                }}
              >
                {currentValue}
              </Typography>
            );
          }
        },
      })
    );

    // Actions column with edit/save/cancel
    const actionsColumn: Column = {
      key: "actions",
      header: "Actions",
      align: "center" as const,
      width: 120,
      sx: cellPaddingSx,
      render: (_value: string, row: any) => {
        const isEditing = editingRows.has(row.id);

        if (isEditing) {
          return (
            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
              <Tooltip title="Save">
                <IconButton
                  size="small"
                  onClick={() => handleSaveRow(row.id)}
                  sx={{ color: "primary.main" }}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={() => handleCancelEdit(row.id)}
                  sx={{ color: "text.secondary" }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        } else {
          return (
            <Tooltip title="Edit Lead Times">
              <IconButton
                size="small"
                onClick={() => handleEditRow(row.id)}
                sx={{ color: "primary.main" }}
                disabled={!selectedMarket}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }
      },
    };

    return [...baseColumns, ...leadTimeColumns, actionsColumn];
  }, [
    selectedMarket,
    configurations,
    defaultConfigurations,
    editingRows,
    tempValues,
    handleEditRow,
    handleSaveRow,
    handleCancelEdit,
    handleTempValueChange,
  ]);

  return (
    <Box sx={{ p: 2 }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress />
        </Box>
      ) : selectedMarket ? (
        <DynamicTable
          data={tableData}
          columns={columns}
          getRowId={(row) => row.id}
          stickyHeader={true}
          maxHeight="450px"
          rowsPerPageOptions={[25, 50, 100]}
          enableColumnFiltering={true}
          defaultRowsPerPage={25}
        />
      ) : (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Please select a market to configure lead times
          </Typography>
        </Box>
      )}
    </Box>
  );
};
