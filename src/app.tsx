import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NavigationAppBar } from "./navigation/appbar";
import { Sidebar } from "./navigation/sidebar";
import { VolumeView } from "./volume/volumeView";
import { Dashboard } from "./dashboard/dashboard";
import { ForecastProvider } from "./data/data";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import { DataExplorer } from "./dataExplorer/dataExplorer";
import { Overhead } from "./overhead/overhead";
import { Marketing } from "./a&p/marketing";
import { Rates } from "./rates/rates";
import ProfitModel from "./profitModel/profitModel";
import { SettingsContainer } from "./settings/settingsContainer";
import { DiscountsView } from "./discounts/discounts";
import { Login } from "./login/login";
import { UserProvider } from "./userContext";

const drawerWidth = 240;

// Separate component for the main app layout
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // If we're on the login page, only render the login component
  if (location.pathname === "/login") {
    return (
      <Box sx={{ p: 2 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Box>
    );
  }

  // Otherwise render the full app layout with navigation
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <NavigationAppBar toggleSidebar={toggleSidebar} />
      <Sidebar
        isOpen={sidebarOpen}
        drawerWidth={drawerWidth}
        onClose={() => setSidebarOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
          transition: (theme) =>
            theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          overflow: "auto",
          position: "relative",
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ p: 2 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rates" element={<Rates />} />
            <Route path="/P&LModel" element={<ProfitModel />} />
            <Route path="/volume" element={<VolumeView />} />
            <Route path="/discounts" element={<DiscountsView />} />
            <Route path="/settings" element={<SettingsContainer />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/overhead" element={<Overhead />} />
            <Route path="/data-explorer" element={<DataExplorer />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

export const App = () => {
  // Check if user is signed in using localStorage
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  return (
    <UserProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {!isAuthenticated ? (
          <Login />
        ) : (
          <ForecastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<AppLayout />} />
              </Routes>
            </BrowserRouter>
          </ForecastProvider>
        )}
      </ThemeProvider>
    </UserProvider>
  );
};

export default App;
