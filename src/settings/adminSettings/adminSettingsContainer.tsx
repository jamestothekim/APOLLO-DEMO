import { useState, useRef } from "react";
import { Box, Tabs, Tab, Typography, Paper, Button, Chip } from "@mui/material";
import UserMaster, { UserMasterHandle } from "./userMaster";
import { MarketMaster } from "./marketMaster";
import { Atlas } from "./atlas/atlas";
import { RateMaster } from "./rateMaster";
import { AuditLogs } from "./auditLogs";
import { PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { ProductMaster } from "./productMaster";

export const AdminSettingsContainer = () => {
  const [activeTab, setActiveTab] = useState(0);
  const userMasterRef = useRef<UserMasterHandle>(null);
  const atlasEnabled = true; // TODO: replace with client preference flag

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddUserClick = () => {
    userMasterRef.current?.handleAdd();
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            color: (theme) => theme.palette.primary.main,
          }}
        >
          ADMIN SETTINGS
        </Typography>

        {activeTab === 0 && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={handleAddUserClick}
            sx={{
              textTransform: "none",
              borderRadius: "3px",
            }}
          >
            Add User
          </Button>
        )}
      </Box>

      <Box>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Users" />
            <Tab label="Market" />
            <Tab label="Products" />
            {atlasEnabled && (
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Atlas
                    <Chip
                      label="PROTO"
                      color="secondary"
                      size="small"
                      sx={{ borderRadius: 4, ml: 1, fontSize: "0.65em" }}
                    />
                  </Box>
                }
              />
            )}
            <Tab label="Rates" />
            <Tab label="Logs" />
          </Tabs>
        </Box>
        <Box sx={{ pt: 3 }}>
          {activeTab === 0 && <UserMaster ref={userMasterRef} />}
          {activeTab === 1 && <MarketMaster />}
          {activeTab === 2 && <ProductMaster />}
          {atlasEnabled && activeTab === 3 && <Atlas />}
          {(!atlasEnabled && activeTab === 3) ||
          (atlasEnabled && activeTab === 4) ? (
            <RateMaster />
          ) : null}
          {(!atlasEnabled && activeTab === 4) ||
          (atlasEnabled && activeTab === 5) ? (
            <AuditLogs />
          ) : null}
        </Box>
      </Box>
    </Paper>
  );
};
