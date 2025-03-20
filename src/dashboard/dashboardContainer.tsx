import { useState, useEffect } from "react";
import { Box, Paper, CircularProgress } from "@mui/material";
import { ForecastByBrand } from "./forecastByBrand";

interface DashboardData {
  brand: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total: number;
}

export const DashboardContainer = () => {
  const [data, setData] = useState<DashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/analytics/dashboard`
        );
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const result = await response.json();
        console.log("Dashboard Data:", result);
        setData(result);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Paper elevation={3}>
      <Box sx={{ p: 4 }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <ForecastByBrand data={data} />
            {/* Add more dashboard components here as needed */}
          </Box>
        )}
      </Box>
    </Paper>
  );
};
