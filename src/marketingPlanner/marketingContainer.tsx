import React, { useState } from "react";
import { Box, Paper, Typography, IconButton, Collapse } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { MarketingPlanner } from "./marketingPlanner";
import MarketingSummary from "./marketingSummary";

export const MarketingContainer: React.FC = () => {
  const [summaryOpen, setSummaryOpen] = useState(true);

  return (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}
    >
      {/* Summary Section */}
      <Paper elevation={3}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid rgba(0,0,0,0.12)",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: (theme) => theme.palette.primary.main,
            }}
          >
            MARKETING SUMMARY
          </Typography>
          <IconButton
            onClick={() => setSummaryOpen((open) => !open)}
            size="small"
            sx={{ ml: 2 }}
          >
            {summaryOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>
        <Collapse in={summaryOpen}>
          <MarketingSummary />
        </Collapse>
      </Paper>

      {/* Planner Section - only the component, no extra label */}
      <MarketingPlanner />
    </Box>
  );
};

export default MarketingContainer;
