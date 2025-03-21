import { useEffect, useState } from "react";
import { Box, TextField, Stack, Typography } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import MenuItem from "@mui/material/MenuItem";

interface MarketData {
  market_name: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  settings?: {
    managed_by?: string;
  };
}

export const MarketMaster = () => {
  const [data, setData] = useState<MarketData[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editedMarket, setEditedMarket] = useState<MarketData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/market-master`,
          {
            withCredentials: true,
          }
        );
        const processedData = response.data.map((row: MarketData) => ({
          ...row,
          settings:
            typeof row.settings === "string"
              ? JSON.parse(row.settings)
              : row.settings || { managed_by: "Not Set" },
        }));
        setData(processedData);
      } catch (error) {
        console.error("Error fetching market data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setEditedMarket(selectedMarket);
  }, [selectedMarket]);

  const handleManagedByChange = (value: string) => {
    if (!editedMarket) return;
    setEditedMarket({
      ...editedMarket,
      settings: { ...editedMarket.settings, managed_by: value },
    });
  };

  const handleSave = async () => {
    if (!editedMarket) return;

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/market-master/managed-by`,
        {
          market_code: editedMarket.market_code,
          managed_by: editedMarket.settings?.managed_by,
        },
        {
          withCredentials: true,
        }
      );

      // Update local state
      const updatedData = data.map((market) =>
        market.market_id === editedMarket.market_id ? editedMarket : market
      );
      setData(updatedData);
      setSelectedMarket(editedMarket);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error updating managed by:", error);
    }
  };

  const handleClose = () => {
    setEditedMarket(selectedMarket);
    setSidebarOpen(false);
  };

  const footerButtons = [
    {
      label: "Cancel",
      onClick: handleClose,
      variant: "outlined" as const,
    },
    {
      label: "Save Changes",
      onClick: handleSave,
      variant: "contained" as const,
      disabled:
        JSON.stringify(editedMarket?.settings) ===
        JSON.stringify(selectedMarket?.settings),
    },
  ];

  const columns: Column[] = [
    {
      key: "market_name",
      header: "Market Name",
      render: (value) => value,
    },
    {
      key: "market_code",
      header: "Market Code",
      render: (value) => value,
    },
    {
      key: "market_coding",
      header: "Market Coding",
      render: (value) => value,
    },
    {
      key: "market_id",
      header: "Market ID",
      render: (value) => value,
    },
    {
      key: "settings.managed_by",
      header: "Managed By",
      render: (_value, row) => row.settings?.managed_by || "Not Set",
    },
  ];

  return (
    <Box sx={{ position: "relative", minHeight: "400px" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.market_id}
        defaultRowsPerPage={20}
        rowsPerPageOptions={[20, 50, 100]}
        onRowClick={(row) => {
          setSelectedMarket(row);
          setSidebarOpen(true);
        }}
      />

      <QualSidebar
        open={sidebarOpen}
        onClose={handleClose}
        title="Edit Market Settings"
        width="400px"
        footerButtons={footerButtons}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Market Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Market Name"
                  value={editedMarket?.market_name || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market Code"
                  value={editedMarket?.market_code || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market Coding"
                  value={editedMarket?.market_coding || ""}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Market ID"
                  value={editedMarket?.market_id || ""}
                  disabled
                />
                <TextField
                  select
                  fullWidth
                  label="Managed By"
                  value={editedMarket?.settings?.managed_by || "Not Set"}
                  onChange={(e) => handleManagedByChange(e.target.value)}
                >
                  <MenuItem value="Market">Market</MenuItem>
                  <MenuItem value="Customer">Customer</MenuItem>
                </TextField>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </QualSidebar>
    </Box>
  );
};
