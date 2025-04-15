import { Box, Paper } from "@mui/material";
import { ForecastByBrand } from "./forecastByBrand";
import { LoadingProgress } from "../reusableComponents/loadingProgress";
import { useAppSelector } from "../redux/store";
import {
  selectDashboardData,
  selectVolumeDataStatus,
} from "../redux/depletionSlice"; // Import necessary items from volumeSlice

export const DashboardContainer = () => {
  // Removed unused dispatch
  // Select the processed dashboard data and loading status
  const data = useAppSelector(selectDashboardData); // Use the new selector
  const loadingStatus = useAppSelector(selectVolumeDataStatus); // Use status selector

  // Determine loading state based on status
  const isLoading = loadingStatus === "loading" || loadingStatus === "idle";

  return (
    <Box sx={{ position: "relative" }}>
      {isLoading && (
        <Box sx={{ height: "80vh" }}>
          {/* Keep onComplete for now, as LoadingProgress might still require it */}
          <LoadingProgress onComplete={() => {}} />
        </Box>
      )}
      {/* Use derived isLoading state */}
      <Box sx={{ visibility: isLoading ? "hidden" : "visible" }}>
        <Paper elevation={3}>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Pass the processed data from the selector */}
              <ForecastByBrand data={data} />
              {/* Add more dashboard components here as needed */}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
