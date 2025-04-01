import { useState } from "react";
import { Box, Tabs, Tab, Typography, Paper } from "@mui/material";
import UserMaster from "./userMaster";
import { MarketMaster } from "./marketMaster";
import { SKUMaster } from "./skuMaster";

export const AdminSettingsContainer = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Admin Settings
      </Typography>

      <Box>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Users" />
            <Tab label="Market" />
            <Tab label="SKU" />
          </Tabs>
        </Box>
        <Box sx={{ pt: 3 }}>
          {activeTab === 0 && <UserMaster />}
          {activeTab === 1 && <MarketMaster />}
          {activeTab === 2 && <SKUMaster />}
        </Box>
      </Box>
    </Paper>
  );
};
