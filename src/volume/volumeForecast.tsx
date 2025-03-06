import React, { useState } from "react";
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
import { Model as Depletions } from "./depletions/depletions";
import { MARKET_OPTIONS, ITEM_OPTIONS } from "../data/data";
import { Shipments } from "./shipments/shipments";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

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
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState(true);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarketChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedMarkets(typeof value === "string" ? value.split(",") : value);
  };

  const handleItemChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedItems(typeof value === "string" ? value.split(",") : value);
  };

  const handleDeleteMarket = (marketToDelete: string) => {
    setSelectedMarkets((current) =>
      current.filter((market) => market !== marketToDelete)
    );
  };

  const handleDeleteItem = (itemToDelete: string) => {
    setSelectedItems((current) =>
      current.filter((item) => item !== itemToDelete)
    );
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
              <FormControl sx={{ width: "300px" }}>
                <Select
                  multiple
                  value={selectedMarkets}
                  onChange={handleMarketChange}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          onDelete={() => handleDeleteMarket(value)}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          sx={{ fontSize: "0.875rem" }}
                        />
                      ))}
                    </Box>
                  )}
                  size="small"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 250,
                      },
                    },
                  }}
                  sx={{ fontSize: "0.875rem" }}
                >
                  {MARKET_OPTIONS.map((market) => (
                    <MenuItem
                      key={market}
                      value={market}
                      sx={{ fontSize: "0.875rem" }}
                    >
                      {market}
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
                Item:
              </Typography>
              <FormControl sx={{ width: "300px" }}>
                <Select
                  multiple
                  value={selectedItems}
                  onChange={handleItemChange}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          onDelete={() => handleDeleteItem(value)}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          sx={{ fontSize: "0.875rem" }}
                        />
                      ))}
                    </Box>
                  )}
                  size="small"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 250,
                      },
                    },
                  }}
                  sx={{ fontSize: "0.875rem" }}
                >
                  {ITEM_OPTIONS.map((item) => (
                    <MenuItem
                      key={item}
                      value={item}
                      sx={{ fontSize: "0.875rem" }}
                    >
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Depletion" />
              <Tab label="Shipment" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Depletions
              selectedMarkets={selectedMarkets}
              selectedItems={selectedItems}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Shipments
              selectedMarkets={selectedMarkets}
              selectedItems={selectedItems}
            />
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};
