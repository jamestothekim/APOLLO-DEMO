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

interface Market {
  id: string;
  name: string;
}

// New default configuration structure (per market)
export interface MarketDefaultConfiguration {
  edisonDomestic: string;
  scotlandDI: string;
  irelandDI: string;
  mexicoDI: string;
  tdoiDomestic: string;
  tdoiDI: string;
}

interface DefaultConfigProps {
  markets: Market[];
  defaultConfigurations: Record<string, MarketDefaultConfiguration>;
  onDefaultConfigurationChange: (
    marketId: string,
    field: keyof MarketDefaultConfiguration,
    value: string
  ) => void;
  loading?: boolean;
}

const DEFAULT_FIELDS = [
  {
    key: "edisonDomestic" as keyof MarketDefaultConfiguration,
    label: "Edison",
    subLabel: "Domestic",
  },
  {
    key: "scotlandDI" as keyof MarketDefaultConfiguration,
    label: "Scotland",
    subLabel: "DI",
  },
  {
    key: "irelandDI" as keyof MarketDefaultConfiguration,
    label: "Ireland",
    subLabel: "DI",
  },
  {
    key: "mexicoDI" as keyof MarketDefaultConfiguration,
    label: "Mexico",
    subLabel: "DI",
  },
  {
    key: "tdoiDomestic" as keyof MarketDefaultConfiguration,
    label: "TDOI",
    subLabel: "Domestic",
  },
  {
    key: "tdoiDI" as keyof MarketDefaultConfiguration,
    label: "TDOI",
    subLabel: "DI",
  },
];

// Memoized Material-UI TextField component for default inputs
const DefaultInput: React.FC<{
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

export const DefaultConfig: React.FC<DefaultConfigProps> = ({
  markets,
  defaultConfigurations,
  onDefaultConfigurationChange,
  loading = false,
}) => {
  // Track which rows are in edit mode
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());

  // Track temporary values for rows being edited
  const [tempValues, setTempValues] = useState<
    Record<string, MarketDefaultConfiguration>
  >({});

  // Transform SKU data for DynamicTable
  const tableData = useMemo(() => {
    return markets.map((mkt) => ({
      ...mkt,
    }));
  }, [markets]);

  // Handle entering edit mode
  const handleEditRow = useCallback(
    (marketId: string) => {
      const config = defaultConfigurations[marketId] || {
        edisonDomestic: "30",
        scotlandDI: "30",
        irelandDI: "30",
        mexicoDI: "30",
        tdoiDomestic: "30",
        tdoiDI: "30",
      };

      // Initialize temp values with current config
      setTempValues((prev) => ({
        ...prev,
        [marketId]: { ...config },
      }));

      setEditingRows((prev) => new Set([...prev, marketId]));
    },
    [defaultConfigurations]
  );

  // Handle saving edited row
  const handleSaveRow = useCallback(
    (marketId: string) => {
      const temp = tempValues[marketId];
      if (temp && onDefaultConfigurationChange) {
        // Save all field values
        Object.entries(temp).forEach(([field, value]) => {
          onDefaultConfigurationChange(
            marketId,
            field as keyof MarketDefaultConfiguration,
            value
          );
        });
      }

      // Exit edit mode
      setEditingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(marketId);
        return newSet;
      });

      // Clear temp values
      setTempValues((prev) => {
        const { [marketId]: removed, ...rest } = prev;
        return rest;
      });
    },
    [tempValues, onDefaultConfigurationChange]
  );

  // Handle canceling edit
  const handleCancelEdit = useCallback((marketId: string) => {
    setEditingRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(marketId);
      return newSet;
    });

    setTempValues((prev) => {
      const { [marketId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Handle temp value changes
  const handleTempValueChange = useCallback(
    (
      marketId: string,
      field: keyof MarketDefaultConfiguration,
      value: string
    ) => {
      setTempValues((prev) => ({
        ...prev,
        [marketId]: {
          ...prev[marketId],
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
        header: "Market ID",
        align: "left" as const,
        sortable: true,
        filterable: true,
        width: 120,
        sx: cellPaddingSx,
        render: (value: string) => value,
      },
      {
        key: "name",
        header: "Market Name",
        align: "left" as const,
        sortable: true,
        filterable: true,
        extraWide: true,
        sx: cellPaddingSx,
        render: (value: string) => value,
      },
    ];

    // Default configuration columns with edit-on-demand
    const defaultColumns: Column[] = DEFAULT_FIELDS.map(
      ({ key, label, subLabel }) => ({
        key,
        header: label,
        subHeader: subLabel,
        align: "center" as const,
        sortable: true,
        filterable: true,
        width: key === "tdoiDI" ? 80 : 90,
        sx: cellPaddingSx,
        render: (_value: string, row: any) => {
          const isEditing = editingRows.has(row.id);

          if (isEditing) {
            // Show Material-UI TextField in edit mode
            const tempValue = tempValues[row.id]?.[key] || "";
            return (
              <DefaultInput
                value={tempValue}
                onChange={(value) => handleTempValueChange(row.id, key, value)}
                placeholder="30"
              />
            );
          } else {
            // Show static Typography in view mode
            const config = defaultConfigurations[row.id] || {};
            const currentValue = config[key] || "30"; // Default to 30
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
            <Tooltip title="Edit Default Values">
              <IconButton
                size="small"
                onClick={() => handleEditRow(row.id)}
                sx={{ color: "primary.main" }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }
      },
    };

    return [...baseColumns, ...defaultColumns, actionsColumn];
  }, [
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
      ) : (
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
      )}
    </Box>
  );
};
