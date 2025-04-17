import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  AppBar,
  LinearProgress,
  Alert,
  Button,
} from "@mui/material";
import { useAppSelector, RootState, AppDispatch } from "../redux/store"; // Import hooks and RootState from store
import {
  removeItem,
  fetchDashboardConfig,
  syncDashboardToBackend,
} from "../redux/dashboardSlice"; // Import syncDashboardToBackend
import { DashboardTable } from "./components/dashboardTable";
import { useDispatch } from "react-redux"; // Import useDispatch

const DashboardContainer: React.FC = () => {
  const dispatch: AppDispatch = useDispatch(); // Get dispatch function
  // Select the items array from the dashboard state in Redux
  const dashboardItems = useAppSelector(
    (state: RootState) => state.dashboard.items
  );
  const dashboardStatus = useAppSelector(
    (state: RootState) => state.dashboard.status
  );
  const dashboardError = useAppSelector(
    (state: RootState) => state.dashboard.error
  );
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // Fetch dashboard data when component mounts
  useEffect(() => {
    if (dashboardStatus === "idle") {
      dispatch(fetchDashboardConfig());
    }
  }, [dispatch, dashboardStatus]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // Ensure the new value is within bounds
    if (newValue >= 0 && newValue < dashboardItems.length) {
      setSelectedTabIndex(newValue);
    }
  };

  const handleRetry = () => {
    dispatch(fetchDashboardConfig());
  };

  const handleDelete = (id: string) => {
    // First dispatch the remove action
    dispatch(removeItem({ id }));
    // Then sync the updated state to the backend
    const updatedItems = dashboardItems.filter((item) => item.id !== id);
    dispatch(syncDashboardToBackend(updatedItems));
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: 2,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {dashboardStatus === "loading" ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            minHeight: 400,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 400 }}>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 2, textAlign: "center" }}
            >
              Loading Dashboard
            </Typography>
            <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        </Paper>
      ) : dashboardStatus === "failed" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 2,
          }}
        >
          <Alert severity="error">
            Failed to load dashboard: {dashboardError || "Unknown error"}
          </Alert>
          <Button variant="contained" onClick={handleRetry}>
            Retry
          </Button>
        </Box>
      ) : dashboardItems.length === 0 ? (
        // --- Empty Dashboard Placeholder --- START
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            minHeight: 400, // Make placeholder reasonably tall
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: (theme) => `2px dashed ${theme.palette.primary.light}`,
            textAlign: "center",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            {" "}
            Publish a report to see data here.{" "}
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={2}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden" /* Contain Paper content */,
          }}
        >
          {/* Use AppBar for a conventional Tab location */}
          <AppBar position="static" color="default" elevation={1}>
            <Tabs
              value={selectedTabIndex}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              aria-label="dashboard reports tabs"
            >
              {dashboardItems.map((item, index) => (
                <Tab
                  key={item.id}
                  label={item.name || `${item.type} ${index + 1}`}
                  id={`dashboard-tab-${index}`}
                  aria-controls={`dashboard-tabpanel-${index}`}
                />
              ))}
            </Tabs>
          </AppBar>

          {/* Content Area for the Selected Tab */}
          {dashboardItems.map((item, index) => {
            // Only render the content for the active tab
            if (index !== selectedTabIndex) {
              return null;
            }

            // Conditionally render the correct component
            let content: React.ReactNode;
            switch (item.type) {
              case "table":
                content = (
                  <DashboardTable
                    config={item.config}
                    onDelete={() => handleDelete(item.id)}
                  />
                );
                break;
              default:
                content = (
                  <Typography color="error">
                    Unknown Item Type: {item.type}
                  </Typography>
                );
            }

            // Role and aria attributes for accessibility
            return (
              <Box
                key={item.id}
                role="tabpanel"
                hidden={selectedTabIndex !== index}
                id={`dashboard-tabpanel-${index}`}
                aria-labelledby={`dashboard-tab-${index}`}
                sx={{ flexGrow: 1, overflow: "auto" }}
              >
                {/* Render the content component (which includes the onDelete prop if applicable) */}
                {content}
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
};

export default DashboardContainer;
