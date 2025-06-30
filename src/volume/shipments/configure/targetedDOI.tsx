import React, { useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  DynamicTable,
  type Column,
} from "../../../reusableComponents/dynamicTable";
import { MarketDefaultConfiguration } from "./defaultConfig";

interface TargetedDOIProps {
  skus: any[];
  selectedMarket: string;
  defaultConfigurations: Record<string, MarketDefaultConfiguration>;
  doiConfigurations: Record<string, any>;
  onDOIConfigurationChange: (
    skuId: string,
    month: string,
    value: string,
    selectedMarket: string
  ) => void;
  loading?: boolean;
}

const ALL_MONTHS = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "may", label: "May" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "aug", label: "Aug" },
  { key: "sep", label: "Sep" },
  { key: "oct", label: "Oct" },
  { key: "nov", label: "Nov" },
  { key: "dec", label: "Dec" },
];

// Memoized Material-UI TextField component for DOI inputs
const DOIInput: React.FC<{
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
        width: 50,
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

export const TargetedDOI: React.FC<TargetedDOIProps> = ({
  skus,
  selectedMarket,
  defaultConfigurations,
  doiConfigurations,
  onDOIConfigurationChange,
  loading = false,
}) => {
  // Track which rows are in edit mode
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());

  // Track temporary values for rows being edited
  const [tempValues, setTempValues] = useState<
    Record<string, Record<string, string>>
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
      const config = doiConfigurations[configKey] || {};
      const defaults = defaultConfigurations[selectedMarket];

      // Initialize temp values with current config or defaults
      const currentValues: Record<string, string> = {};
      ALL_MONTHS.forEach(({ key }) => {
        currentValues[key] = config[key] || defaults?.tdoiDomestic || "30";
      });

      setTempValues((prev) => ({
        ...prev,
        [skuId]: currentValues,
      }));

      setEditingRows((prev) => new Set([...prev, skuId]));
    },
    [selectedMarket, doiConfigurations, defaultConfigurations]
  );

  // Handle saving edited row
  const handleSaveRow = useCallback(
    (skuId: string) => {
      if (!selectedMarket) return;

      const temp = tempValues[skuId];
      if (temp && onDOIConfigurationChange) {
        // Save all month values
        Object.entries(temp).forEach(([month, value]) => {
          onDOIConfigurationChange(skuId, month, value, selectedMarket);
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
    [selectedMarket, tempValues, onDOIConfigurationChange]
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
    (skuId: string, month: string, value: string) => {
      setTempValues((prev) => ({
        ...prev,
        [skuId]: {
          ...prev[skuId],
          [month]: value,
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

    // Month columns with edit-on-demand
    const monthColumns: Column[] = ALL_MONTHS.map(({ key, label }) => ({
      key,
      header: label,
      subHeader: "DOI",
      align: "center" as const,
      sortable: true,
      filterable: true,
      width: 65,
      sx: cellPaddingSx,
      render: (_value: string, row: any) => {
        const isEditing = editingRows.has(row.id);

        if (isEditing) {
          // Show Material-UI TextField in edit mode
          const tempValue = tempValues[row.id]?.[key] || "";
          return (
            <DOIInput
              value={tempValue}
              onChange={(value) => handleTempValueChange(row.id, key, value)}
              placeholder="0"
            />
          );
        } else {
          // Show static Typography in view mode
          if (!selectedMarket) return "-";

          const configKey = `${selectedMarket}-${row.id}`;
          const config = doiConfigurations[configKey] || {};
          const defaults = defaultConfigurations[selectedMarket] || {};
          const currentValue = config[key] || defaults.tdoiDomestic || "30";

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
    }));

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
            <Tooltip title="Edit DOI Values">
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

    return [...baseColumns, ...monthColumns, actionsColumn];
  }, [
    selectedMarket,
    doiConfigurations,
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
            Please select a market to configure targeted DOI
          </Typography>
        </Box>
      )}
    </Box>
  );
};
