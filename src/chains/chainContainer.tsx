import React from "react";
import { Box, Container } from "@mui/material";
import { ChainSummary } from "./chainSummary";
import { ChainPlanner } from "./chainPlanner";

export const ChainContainer: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Chain Summary on top */}
        <ChainSummary />

        {/* Chain Planner below */}
        <ChainPlanner />
      </Box>
    </Container>
  );
};

export default ChainContainer;
