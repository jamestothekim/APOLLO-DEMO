import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { Summary } from "./summary";
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

// --- Import Volume Data Fetching --- START
import {
  fetchVolumeData,
  selectRawVolumeData,
  selectVolumeDataStatus,
} from "../redux/depletionSlice";
// --- Import Volume Data Fetching --- END

export const VolumeView = () => {
  const { user } = useUser();
  const dispatch: AppDispatch = useDispatch();

  // --- Redux State for Volume Data ---
  const rawVolumeData = useSelector(selectRawVolumeData);
  const volumeStatus = useSelector(selectVolumeDataStatus);

  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isGuidanceInitializedInRedux = useSelector(selectIsGuidanceInitialized);
  const availableGuidanceFromRedux = useSelector(selectAvailableGuidance);

  // --- Effect to Fetch Volume Data via Redux ---
  useEffect(() => {
    if (volumeStatus === "idle") {
      console.log("[VolumeView] Dispatching fetchVolumeData...");
      // Fetch all data initially; filtering will happen later
      dispatch(
        fetchVolumeData({ markets: null, brands: null, isCustomerView: false })
      );
    }
  }, [dispatch, volumeStatus]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchInitialData = async () => {
      if (!user) {
        console.log(
          "[VolumeView] Skipping fetchInitialData: User not logged in."
        );
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

    fetchInitialData();
  }, [user, dispatch, isGuidanceInitializedInRedux]);

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
            rawVolumeData={rawVolumeData}
            depletionsStatus={volumeStatus}
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
