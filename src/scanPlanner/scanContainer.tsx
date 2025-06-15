import React from "react";
import { Box } from "@mui/material";
import ScanSummary from "./scanSummary";
import ScanPlanner from "./scanPlanner";

/**
 * ScanContainer – staging wrapper for the new Scan Planner module.
 * Shows: summary panel, editable planner (both placeholders), and the
 * current ScanPlannerView reference underneath for easy comparison.
 */
export const ScanContainer: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Summary with Version selector */}
      <ScanSummary />

      {/* 2. Planner */}
      <ScanPlanner />
    </Box>
  );
};

export default ScanContainer;
