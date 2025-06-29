import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { LeadTimes } from "./leadTimes";
import { TargetedDOI } from "./targetedDOI";
import { DefaultConfig } from "./defaultConfig";
import { LoadingProgress } from "../../../reusableComponents/loadingProgress";

interface Market {
  id: string;
  name: string;
  state?: string;
}

interface SKU {
  id: string;
  desc: string;
  brand?: string;
  [key: string]: any;
}

interface LeadTimeConfiguration {
  leadTimeEdison: string;
  leadTimeScotland: string;
  leadTimeIreland: string;
  leadTimeMexico: string;
}

interface DOIConfiguration {
  [month: string]: string; // e.g., "jan": "30", "feb": "28", etc.
}

interface DefaultConfiguration {
  leadTimeEdison: string;
  leadTimeScotland: string;
  leadTimeIreland: string;
  leadTimeMexico: string;
  targetDOI: string;
}

interface ConfigureContainerProps {
  open: boolean;
  onClose: () => void;
}

export const ConfigureContainer: React.FC<ConfigureContainerProps> = ({
  open,
  onClose,
}) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingSKUs, setLoadingSKUs] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [defaultsModalOpen, setDefaultsModalOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [loadingComplete, setLoadingComplete] = useState(false);

  // Default configurations by SKU ID
  const [defaultConfigurations, setDefaultConfigurations] = useState<
    Record<string, DefaultConfiguration>
  >({});

  // Market-specific configurations for lead times and DOI
  const [leadTimeConfigurations, setLeadTimeConfigurations] = useState<
    Record<string, LeadTimeConfiguration>
  >({});
  const [doiConfigurations, setDOIConfigurations] = useState<
    Record<string, DOIConfiguration>
  >({});

  // Fetch markets and SKUs once when dialog opens
  useEffect(() => {
    if (open && !initialDataLoaded) {
      fetchMarkets();
      fetchSKUs();
    }
  }, [open, initialDataLoaded]);

  const fetchMarkets = async () => {
    setLoadingMarkets(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/util/get-markets-by-division`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();

      // Extract all markets from the nested structure
      const allMarkets: Market[] = [];
      Object.values(data).forEach((division: any) => {
        if (division && typeof division === "object") {
          Object.values(division).forEach((subDivision: any) => {
            if (Array.isArray(subDivision)) {
              subDivision.forEach((market: any) => {
                if (market && market.market_id && market.market_name) {
                  allMarkets.push({
                    id: market.market_id,
                    name: market.market_name,
                  });
                }
              });
            }
          });
        }
      });

      setMarkets(allMarkets);
      // Auto-select first market when markets load
      if (allMarkets.length > 0 && !selectedMarket) {
        setSelectedMarket(allMarkets[0].id);
      }
    } catch (error) {
      console.error("Error fetching markets:", error);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const fetchSKUs = async () => {
    setLoadingSKUs(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/util/get-sku-master`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();

      // Transform to our SKU interface
      const transformedSKUs: SKU[] = data.map((sku: any) => ({
        id: sku.sku_id,
        desc: sku.sku_description,
        brand: sku.brand,
        ...sku,
      }));

      setSKUs(transformedSKUs);
      setInitialDataLoaded(true);

      // Initialize default configurations with 30 days for all SKUs
      initializeDefaultConfigurations(transformedSKUs);
    } catch (error) {
      console.error("Error fetching SKUs:", error);
    } finally {
      setLoadingSKUs(false);
    }
  };

  const initializeDefaultConfigurations = (skuList: SKU[]) => {
    const newDefaultConfigs = { ...defaultConfigurations };

    skuList.forEach((sku) => {
      // Initialize default configuration only if it doesn't exist
      if (!newDefaultConfigs[sku.id]) {
        newDefaultConfigs[sku.id] = {
          leadTimeEdison: "30",
          leadTimeScotland: "30",
          leadTimeIreland: "30",
          leadTimeMexico: "30",
          targetDOI: "30",
        };
      }
    });

    setDefaultConfigurations(newDefaultConfigs);
  };

  const handleDefaultConfigurationChange = useCallback(
    (skuId: string, field: keyof DefaultConfiguration, value: string) => {
      setDefaultConfigurations((prev) => ({
        ...prev,
        [skuId]: {
          ...prev[skuId],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleLeadTimeConfigurationChange = useCallback(
    (
      skuId: string,
      field: keyof LeadTimeConfiguration,
      value: string,
      selectedMarket: string
    ) => {
      const key = `${selectedMarket}-${skuId}`;
      setLeadTimeConfigurations((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
        },
      }));
    },
    []
  );

  const handleDOIConfigurationChange = useCallback(
    (skuId: string, month: string, value: string, selectedMarket: string) => {
      const key = `${selectedMarket}-${skuId}`;
      setDOIConfigurations((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [month]: value,
        },
      }));
    },
    []
  );

  // Reset all state when dialog closes
  const resetState = useCallback(() => {
    setActiveTab(0);
    setLeadTimeConfigurations({});
    setDOIConfigurations({});
    setDefaultConfigurations({});
    setInitialDataLoaded(false);
    setSKUs([]);
    setMarkets([]);
    setDefaultsModalOpen(false);
    setLoadingComplete(false);
  }, []);

  // Handle dialog close with state reset
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSave = useCallback(() => {
    console.log("Saving configurations:", {
      defaults: defaultConfigurations,
      leadTimes: leadTimeConfigurations,
      doi: doiConfigurations,
    });
    // TODO: Implement actual save API call here
    handleClose();
  }, [
    defaultConfigurations,
    leadTimeConfigurations,
    doiConfigurations,
    handleClose,
  ]);

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setActiveTab(newValue);
    },
    []
  );

  // Memoize computed values to prevent unnecessary recalculations
  const hasValidData = useMemo(() => skus.length > 0, [skus.length]);
  const isLoading = useMemo(
    () => loadingMarkets || loadingSKUs,
    [loadingMarkets, loadingSKUs]
  );

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
        <DialogContent sx={{ minHeight: "600px", pb: 0, pt: 2 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                  pb: 2,
                  borderBottom: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <LocalShippingIcon
                    sx={{
                      fontSize: "2rem",
                      color: "primary.main",
                    }}
                  />
                  <Typography
                    variant="h5"
                    sx={{
                      color: "primary.main",
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                    }}
                  >
                    CONFIGURE SHIPMENT LOGIC
                  </Typography>
                </Box>

                {/* Market Filter */}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="market-select-label">
                    Select Market
                  </InputLabel>
                  <Select
                    labelId="market-select-label"
                    value={selectedMarket}
                    label="Select Market"
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">
                      <em>Select a market...</em>
                    </MenuItem>
                    {markets.map((market) => (
                      <MenuItem key={market.id} value={market.id}>
                        {market.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {isLoading && !loadingComplete ? (
                <Box
                  sx={{
                    minHeight: "500px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LoadingProgress
                    onComplete={() => setLoadingComplete(true)}
                    dataReady={hasValidData}
                  />
                </Box>
              ) : hasValidData ? (
                <Box>
                  {/* Section Tabs - Only Lead Times and Targeted DOI */}
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                  >
                    <Tab
                      label="Lead Times"
                      sx={{ textTransform: "none", fontSize: "0.9rem" }}
                    />
                    <Tab
                      label="Target DOI"
                      sx={{ textTransform: "none", fontSize: "0.9rem" }}
                    />
                  </Tabs>

                  {/* Section Content */}
                  <Box sx={{ mt: -2 }}>
                    {activeTab === 0 && (
                      <LeadTimes
                        skus={skus}
                        selectedMarket={selectedMarket}
                        defaultConfigurations={defaultConfigurations}
                        configurations={leadTimeConfigurations}
                        onConfigurationChange={
                          handleLeadTimeConfigurationChange
                        }
                        loading={loadingSKUs}
                      />
                    )}

                    {activeTab === 1 && (
                      <TargetedDOI
                        skus={skus}
                        selectedMarket={selectedMarket}
                        defaultConfigurations={defaultConfigurations}
                        doiConfigurations={doiConfigurations}
                        onDOIConfigurationChange={handleDOIConfigurationChange}
                        loading={loadingSKUs}
                      />
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SettingsIcon />}
            onClick={() => setDefaultsModalOpen(true)}
            sx={{
              textTransform: "none",
            }}
          >
            Configure Defaults
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose} variant="outlined" size="large">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              size="large"
              disabled={!hasValidData}
            >
              Save Configuration
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Defaults Configuration Modal */}
      <Dialog
        open={defaultsModalOpen}
        onClose={() => setDefaultsModalOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogContent sx={{ minHeight: "500px", pb: 0, pt: 2 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 3,
                  pb: 2,
                  borderBottom: "2px solid",
                  borderColor: "primary.main",
                }}
              >
                <SettingsIcon
                  sx={{
                    fontSize: "2rem",
                    color: "primary.main",
                  }}
                />
                <Typography
                  variant="h5"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  CONFIGURE DEFAULT VALUES
                </Typography>
              </Box>

              <DefaultConfig
                skus={skus}
                defaultConfigurations={defaultConfigurations}
                onDefaultConfigurationChange={handleDefaultConfigurationChange}
                loading={loadingSKUs}
              />
            </CardContent>
          </Card>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDefaultsModalOpen(false)}
            variant="outlined"
            size="large"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
