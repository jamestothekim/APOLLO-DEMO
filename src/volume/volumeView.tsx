import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { Summary } from "./summary/summary";
import { LoadingProgress } from "../reusableComponents/loadingProgress";
import { VolumeForecast, type MarketData } from "./volumeForecast";
import { useUser } from "../userContext";
import axios from "axios";

// --- Redux Imports --- // Renamed from userSettingsSlice
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../redux/store"; // Import RootState
import {
  fetchGuidance,
  initializePendingGuidance,
  selectIsGuidanceInitialized,
  selectAvailableGuidance,
} from "../redux/userSettingsSlice"; // Use correct filename

export const VolumeView = () => {
  const { user, isLoggedIn } = useUser();
  const dispatch: AppDispatch = useDispatch();

  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isGuidanceInitializedInRedux = useSelector(selectIsGuidanceInitialized);
  const availableGuidanceFromRedux = useSelector(selectAvailableGuidance);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchInitialData = async () => {
      if (!user) {
        setIsInitialDataLoading(false);
        return;
      }

      setIsInitialDataLoading(true);
      setFetchError(null);
      try {
        const brandsPromise = axios.get<string[]>(
          `${import.meta.env.VITE_API_URL}/volume/brands`
        );

        let marketsPromise = Promise.resolve({ data: [] as MarketData[] });
        if (user?.user_access?.Markets?.length) {
          const userMarketIds = user.user_access.Markets.map((m) => m.id);
          marketsPromise = axios.get<MarketData[]>(
            `${
              import.meta.env.VITE_API_URL
            }/volume/get-markets?ids=${userMarketIds.join(",")}`
          );
        }

        // Fetch brands and markets concurrently
        const [brandsResponse, marketsResponse] = await Promise.all([
          brandsPromise,
          marketsPromise,
        ]);

        setAvailableBrands(brandsResponse.data);
        setMarketData(marketsResponse.data);

        // Dispatch fetchGuidance thunk
        dispatch(fetchGuidance());

        // --- Initialize Redux Pending State --- START
        if (!isGuidanceInitializedInRedux && user?.user_settings) {
          const guidanceSettings = user.user_settings.guidance_settings || {};
          const initialPayload = {
            forecastCols: guidanceSettings.forecast_cols || [],
            forecastRows: guidanceSettings.forecast_rows || [],
            summaryCols: guidanceSettings.summary_cols || [],
            summaryRows: guidanceSettings.summary_rows || [],
          };
          dispatch(initializePendingGuidance(initialPayload));
        }
        // --- Initialize Redux Pending State --- END
      } catch (error) {
        console.error("Error fetching initial volume data:", error);
        setFetchError(
          "Failed to load initial data. Please try refreshing the page."
        );
        setAvailableBrands([]);
        setMarketData([]);
      } finally {
        setIsInitialDataLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchInitialData();
    }
  }, [user, dispatch, isGuidanceInitializedInRedux, isLoggedIn]);

  return (
    <Box sx={{ position: "relative" }}>
      {isInitialDataLoading && (
        <Box
          sx={{
            height: "80vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LoadingProgress onComplete={() => {}} />
        </Box>
      )}
      {fetchError && !isInitialDataLoading && (
        <Box
          sx={{
            height: "80vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "error.main",
          }}
        >
          {fetchError}
        </Box>
      )}
      {!isInitialDataLoading && !fetchError && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Summary
            availableBrands={availableBrands}
            marketData={marketData}
            availableGuidance={availableGuidanceFromRedux}
          />
          <VolumeForecast
            availableBrands={availableBrands}
            marketData={marketData}
          />
        </Box>
      )}
    </Box>
  );
};
