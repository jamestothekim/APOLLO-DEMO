import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  OutlinedInput,
  Select,
  Typography,
  SelectChangeEvent,
  MenuItem,
  Chip,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Collapse,
} from "@mui/material";
import { Depletions } from "./depletions/depletions";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { useUser } from "../userContext";
import { Toolbox } from "./components/toolbox";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`volume-tabpanel-${index}`}
      aria-labelledby={`volume-tab-${index}`}
      {...other}
      sx={{ mt: 2 }}
    >
      {value === index && children}
    </Box>
  );
};

export const VolumeForecast: React.FC = () => {
  const { user } = useUser();
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [isBrandsLoading, setIsBrandsLoading] = useState(false);

  // Get available markets from user access
  const availableMarkets = user?.user_access?.Markets || [];

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsBrandsLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/volume/brands`
        );
        if (!response.ok) throw new Error("Failed to fetch brands");
        const data = await response.json();
        setAvailableBrands(data);
      } catch (error) {
        console.error("Error loading brands:", error);
      } finally {
        setIsBrandsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarketChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedMarkets(typeof value === "string" ? value.split(",") : value);
  };

  const handleBrandChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedBrands(typeof value === "string" ? value.split(",") : value);
  };

  return (
    <Paper elevation={3}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton size="small">
          {expanded ? <RemoveIcon /> : <AddIcon />}
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          VOLUME FORECAST (9L)
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          <Box
            sx={{
              mb: 4,
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "0.875rem",
                }}
              >
                Market:
              </Typography>
              <FormControl sx={{ minWidth: "300px", flex: 1 }}>
                <Select
                  multiple
                  value={selectedMarkets}
                  onChange={handleMarketChange}
                  input={<OutlinedInput />}
                  size="small"
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return "Please select market";
                    }
                    return (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          maxWidth: "100%", // Ensure chips wrap within container
                        }}
                      >
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              borderRadius: "16px",
                              backgroundColor: "transparent",
                              "& .MuiChip-label": {
                                px: 1,
                              },
                            }}
                            onDelete={() =>
                              setSelectedMarkets((prev) =>
                                prev.filter((market) => market !== value)
                              )
                            }
                          />
                        ))}
                      </Box>
                    );
                  }}
                >
                  {availableMarkets.map((market) => (
                    <MenuItem key={market.state_code} value={market.state_code}>
                      {market.state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                component="span"
                sx={{
                  fontWeight: "500",
                  textTransform: "uppercase",
                  fontSize: "0.875rem",
                }}
              >
                Brand:
              </Typography>
              <FormControl sx={{ width: "300px" }}>
                <Select
                  multiple
                  value={selectedBrands}
                  onChange={handleBrandChange}
                  input={<OutlinedInput />}
                  disabled={isBrandsLoading}
                  size="small"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {isBrandsLoading
                        ? "Loading..."
                        : selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{
                                borderRadius: "16px",
                                backgroundColor: "transparent",
                                "& .MuiChip-label": {
                                  px: 1,
                                },
                              }}
                              onDelete={() =>
                                setSelectedBrands((prev) =>
                                  prev.filter((brand) => brand !== value)
                                )
                              }
                            />
                          ))}
                    </Box>
                  )}
                >
                  {availableBrands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Toolbox />

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Depletion" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Depletions
              selectedMarkets={selectedMarkets}
              selectedBrands={selectedBrands}
            />
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};
