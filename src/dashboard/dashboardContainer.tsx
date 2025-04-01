import { useState, useEffect } from "react";
import { Box, Paper } from "@mui/material";
import { ForecastByBrand } from "./forecastByBrand";
import { LoadingProgress } from "../reusableComponents/loadingProgress";
import axios from "axios";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/analytics/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Box sx={{ position: "relative" }}>
      {isLoading && (
        <Box sx={{ height: "80vh" }}>
          <LoadingProgress onComplete={() => setIsLoading(false)} />
        </Box>
      )}
      <Box sx={{ visibility: isLoading ? "hidden" : "visible" }}>
        <Paper elevation={3}>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <ForecastByBrand data={data} />
              {/* Add more dashboard components here as needed */}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
