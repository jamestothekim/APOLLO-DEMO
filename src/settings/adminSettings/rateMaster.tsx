import { useEffect, useState } from "react";
import { Box, Typography, Stack } from "@mui/material";
import axios from "axios";
import { DynamicTable, Column } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import { LoadingProgress } from "../../reusableComponents/loadingProgress";

interface RateData {
  market: string;
  planning_member: string;
  size_pack: string;
  direct_import: number;
  warehouse: number;
  [key: string]: any; // Add this to handle any additional fields
}

export const RateMaster = () => {
  const [data, setData] = useState<RateData[]>([]);
  const [selectedRate, setSelectedRate] = useState<RateData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

        // Add unique IDs using index to avoid duplicates
        const dataWithIds = response.data.map(
          (row: RateData, index: number) => ({
            ...row,
            id: `${row.market}-${row.planning_member}-${row.size_pack}-${index}`,
          })
        );

        setData(dataWithIds);
      } catch (error) {
        console.error("Error fetching GSV rate data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      key: "market",
      header: "Market",
      width: 220,
      sortable: true,
      filterable: true,
    },
    {
      key: "planning_member",
      header: "Planning Member",
      width: 220,
      sortable: true,
      filterable: true,
    },
    {
      key: "size_pack",
      header: "Size Pack",
      width: 220,
      sortable: true,
      filterable: true,
    },
    {
      key: "direct_import",
      header: "Direct Import",
      width: 120,
      align: "right",
      render: (v) =>
        v === null || v === undefined ? "" : Number(v).toFixed(1),
      sortable: true,
      sortAccessor: (row) => row.direct_import ?? null,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      width: 120,
      align: "right",
      render: (v) =>
        v === null || v === undefined ? "" : Number(v).toFixed(1),
      sortable: true,
      sortAccessor: (row) => row.warehouse ?? null,
    },
  ];

  if (loading) {
    return <LoadingProgress onComplete={() => setLoading(false)} />;
  }

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      <DynamicTable
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={handleRowClick}
        rowsPerPageOptions={[25, 50, 100]}
        defaultRowsPerPage={50}
        enableColumnFiltering
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
                      {selectedRate.market}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Planning Member
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedRate.planning_member}
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
                      {selectedRate.size_pack}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Direct Import
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color="primary.main"
                    >
                      {selectedRate.direct_import
                        ? Number(selectedRate.direct_import).toFixed(1)
                        : ""}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Warehouse
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color="primary.main"
                    >
                      {selectedRate.warehouse
                        ? Number(selectedRate.warehouse).toFixed(1)
                        : ""}
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
