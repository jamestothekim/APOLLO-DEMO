import React, { useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  CircularProgress,
  Typography,
  MenuItem,
} from "@mui/material";
import {
  DynamicTable,
  type Column,
} from "../../../reusableComponents/dynamicTable";
import { MarketDefaultConfiguration } from "./defaultConfig";

interface SKU {
  id: string;
  desc: string;
  brand?: string;
  [key: string]: any;
}

interface SKUConfiguration {
  location: string; // Stores selected location key (e.g., "edisonDomestic")
}

interface LeadTimesProps {
  skus: SKU[];
  selectedMarket: string;
  defaultConfigurations: Record<string, MarketDefaultConfiguration>;
  configurations: Record<string, SKUConfiguration>; // key: `${marketId}-${skuId}`
  onConfigurationChange: (
    skuId: string,
    value: string,
    selectedMarket: string
  ) => void;
  loading?: boolean;
}

const LOCATION_OPTIONS = [
  { key: "edisonDomestic", label: "Edison - Domestic" },
  { key: "scotlandDI", label: "Scotland - DI" },
  { key: "irelandDI", label: "Ireland - DI" },
  { key: "mexicoDI", label: "Mexico - DI" },
];

// Memoized Select component for location selection
const LocationSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = React.memo(({ value, onChange }) => {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        minWidth: 180,
      }}
    >
      {LOCATION_OPTIONS.map((opt) => (
        <MenuItem key={opt.key} value={opt.key}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
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
  // No edit mode needed; configuration updates immediately on selection

  // Transform SKU data for DynamicTable
  const tableData = useMemo(() => {
    return skus.map((sku) => ({
      ...sku,
    }));
  }, [skus]);

  const handleLocationChange = useCallback(
    (skuId: string, value: string) => {
      if (!selectedMarket) return;
      onConfigurationChange(skuId, value, selectedMarket);
    },
    [onConfigurationChange, selectedMarket]
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

    // Location column (editable) and Days column (read-only)
    const locationColumn: Column = {
      key: "location",
      header: "Location",
      align: "center" as const,
      filterable: true,
      width: 200,
      sx: cellPaddingSx,
      render: (_: string, row: any) => {
        const configKey = `${selectedMarket}-${row.id}`;
        const config = configurations[configKey] || {
          location: "edisonDomestic",
        };
        const currentLocation = config.location;

        return (
          <LocationSelect
            value={currentLocation}
            onChange={(val) => handleLocationChange(row.id, val)}
          />
        );
      },
    };

    const daysColumn: Column = {
      key: "days",
      header: "Lead Time (Days)",
      align: "center" as const,
      sortable: true,
      width: 120,
      sx: cellPaddingSx,
      render: (_: any, row: any) => {
        if (!selectedMarket) return "-";

        const configKey = `${selectedMarket}-${row.id}`;
        const config = configurations[configKey] || {
          location: "edisonDomestic",
        };
        const marketDefaults =
          defaultConfigurations[selectedMarket] ||
          ({} as MarketDefaultConfiguration);

        const days = (marketDefaults as any)[config.location] || "-";
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
            {days}
          </Typography>
        );
      },
    };

    return [...baseColumns, locationColumn, daysColumn];
  }, [
    selectedMarket,
    configurations,
    defaultConfigurations,
    handleLocationChange,
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
