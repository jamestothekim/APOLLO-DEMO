import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { Summary } from "./summary/summary";
import { LoadingProgress } from "../reusableComponents/loadingProgress";
import { VolumeForecast, type MarketData } from "./volumeForecast";
import { useUser } from "../userContext";
import axios from "axios";

// --- Redux Imports --- // Renamed from userSettingsSlice
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../redux/store"; // Import RootState
import { fetchGuidance } from "../redux/slices/userSettingsSlice";

export const VolumeView = () => {
  const { user, isLoggedIn } = useUser();
  const dispatch: AppDispatch = useDispatch();

  const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
        // Demo mode - use static brand and market data
        const { DEMO_BRANDS, generateMarketData } = await import(
          "../playData/dataGenerators"
        );
        const { simulateApiDelay } = await import("../playData/demoConfig");

        await simulateApiDelay(); // Simulate API delay

        setAvailableBrands(DEMO_BRANDS);

        // Generate market data based on user access
        if (user?.user_access?.Markets?.length) {
          const userMarketIds = user.user_access.Markets.map((m) => m.id);
          const marketData = generateMarketData(userMarketIds);
          setMarketData(marketData);
        } else {
          setMarketData([]);
        }

        // Dispatch fetchGuidance thunk
        dispatch(fetchGuidance());

        // Guidance columns/rows are now loaded exclusively via loadGuidanceSettings (triggered in UserContext),
        // so no additional initialization is required here.
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
  }, [user, dispatch, isLoggedIn]);

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
          <Summary availableBrands={availableBrands} marketData={marketData} />
          <VolumeForecast
            availableBrands={availableBrands}
            marketData={marketData}
          />
        </Box>
      )}
    </Box>
  );
};
