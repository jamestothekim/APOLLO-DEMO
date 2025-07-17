import React from "react";
import { Box, TextField, Autocomplete, Chip } from "@mui/material";
import { MARKETS, BRANDS } from "../marketingPlayData/marketingData";

const MAX_CHIPS_VISIBLE = 3;

interface MarketingFiltersProps {
  selectedMarkets: number[];
  selectedBrands: number[];
  onMarketChange: (markets: number[]) => void;
  onBrandChange: (brands: number[]) => void;
}

const MarketingFilters: React.FC<MarketingFiltersProps> = ({
  selectedMarkets,
  selectedBrands,
  onMarketChange,
  onBrandChange,
}) => {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Autocomplete
          multiple
          limitTags={MAX_CHIPS_VISIBLE}
          options={MARKETS}
          value={MARKETS.filter((market) =>
            selectedMarkets.includes(market.id)
          )}
          onChange={(_, newValue) => onMarketChange(newValue.map((m) => m.id))}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Filter Markets" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option.name}
                size="small"
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: "16px",
                  backgroundColor: "transparent",
                  "& .MuiChip-label": { px: 1 },
                }}
                {...getTagProps({ index })}
              />
            ))
          }
          sx={{ width: "100%" }}
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <Autocomplete
          multiple
          limitTags={MAX_CHIPS_VISIBLE}
          options={BRANDS}
          value={BRANDS.filter((brand) => selectedBrands.includes(brand.id))}
          onChange={(_, newValue) => onBrandChange(newValue.map((b) => b.id))}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField {...params} label="Filter Brands" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option.name}
                size="small"
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: "16px",
                  backgroundColor: "transparent",
                  "& .MuiChip-label": { px: 1 },
                }}
                {...getTagProps({ index })}
              />
            ))
          }
          sx={{ width: "100%" }}
        />
      </Box>

      {/* Program tags filter can be added here in the future */}
    </Box>
  );
};

export default MarketingFilters;
