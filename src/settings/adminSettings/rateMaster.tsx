import { useEffect, useState } from "react";
import { Box, Typography, Stack, Autocomplete, TextField } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";

interface RateData {
  hp_market: string;
  market_code: string;
  planning_member: string;
  customer_id: string;
  hp_size_pack: string;
  variant_size_pack_id: string;
  gsv_rate: string | number;
  [key: string]: any; // Add this to handle any additional fields
}

export const RateMaster = () => {
  const [data, setData] = useState<RateData[]>([]);
  const [selectedRate, setSelectedRate] = useState<RateData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedSizePack, setSelectedSizePack] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/gsv-rates`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Add unique IDs to each row
        const dataWithIds = response.data.map((row: RateData) => ({
          ...row,
          id: `${row.hp_market}-${row.variant_size_pack_id}`,
        }));

        setData(dataWithIds);
      } catch (error) {
        console.error("Error fetching GSV rate data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique markets for the filter
  const uniqueMarkets = Array.from(
    new Set(data.filter((item) => item.hp_market).map((item) => item.hp_market))
  ).sort((a, b) => a.localeCompare(b));

  // Get unique size packs for the filter
  const uniqueSizePacks = Array.from(
    new Set(
      data.filter((item) => item.hp_size_pack).map((item) => item.hp_size_pack)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Apply filters to the data
  const filteredData = data.filter((item) => {
    const marketMatch = selectedMarket
      ? item.hp_market === selectedMarket
      : true;
    const sizePackMatch = selectedSizePack
      ? item.hp_size_pack === selectedSizePack
      : true;
    return marketMatch && sizePackMatch;
  });

  const handleRowClick = (row: RateData) => {
    setSelectedRate(row);
    setSidebarOpen(true);
  };

  const handleClose = () => {
    setSelectedRate(null);
    setSidebarOpen(false);
  };

  const columns: Column[] = [
    {
      key: "hp_market",
      header: "Market",
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
    },
    {
      key: "hp_size_pack",
      header: "Size Pack",
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
    },
    {
      key: "variant_size_pack_id",
      header: "Size Pack ID",
      render: (value) =>
        value !== null && value !== undefined ? String(value) : "",
    },
    {
      key: "gsv_rate",
      header: "GSV",
      align: "right",
      render: (value) => {
        if (value === null || value === undefined) return "";
        try {
          return Number(value).toFixed(2);
        } catch (error) {
          console.error("Error converting gsv_rate to number:", error);
          return value;
        }
      },
    },
  ];

  if (loading) {
    return <LoadingProgress onComplete={() => setLoading(false)} />;
  }

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      <Box
        sx={{ mb: 2, display: "flex", gap: 2, justifyContent: "flex-start" }}
      >
        <Autocomplete
          options={uniqueMarkets}
          value={selectedMarket}
          onChange={(_event, newValue) => {
            setSelectedMarket(newValue);
            setPage(0);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filter by Market"
              size="small"
              sx={{ width: 250 }}
            />
          )}
          clearOnBlur={false}
          freeSolo={false}
          loading={data.length === 0}
          getOptionLabel={(option) => option || ""}
        />

        <Autocomplete
          options={uniqueSizePacks}
          value={selectedSizePack}
          onChange={(_event, newValue) => {
            setSelectedSizePack(newValue);
            setPage(0);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filter by Size Pack"
              size="small"
              sx={{ width: 350 }}
            />
          )}
          clearOnBlur={false}
          freeSolo={false}
          loading={data.length === 0}
          getOptionLabel={(option) => option || ""}
        />
      </Box>

      <DynamicTable
        data={filteredData}
        columns={columns}
        onRowClick={handleRowClick}
        rowsPerPageOptions={[25, 50, 100]}
        defaultRowsPerPage={50}
        getRowId={(row) => row.id}
        page={page}
        onPageChange={(_event, newPage) => setPage(newPage)}
      />

      <QualSidebar
        open={sidebarOpen}
        onClose={handleClose}
        title="GSV Rate Details"
        width="500px"
      >
        {selectedRate && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={4}>
              {/* Market Information Section */}
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                  Market Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Market
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.hp_market}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Market Code
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.market_code}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Customer Information Section */}
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                  Customer Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Planning Member
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.planning_member}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Customer ID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.customer_id}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Product Information Section */}
              <Box>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                  Product Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Size Pack
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.hp_size_pack}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Size Pack ID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.variant_size_pack_id}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      GSV Rate
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color="primary.main"
                    >
                      $
                      {(() => {
                        const value = selectedRate.gsv_rate;
                        if (value === null || value === undefined) return "";
                        try {
                          return Number(value).toFixed(2);
                        } catch (error) {
                          console.error(
                            "Error converting gsv_rate to number:",
                            error
                          );
                          return value;
                        }
                      })()}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}
      </QualSidebar>
    </Box>
  );
};
