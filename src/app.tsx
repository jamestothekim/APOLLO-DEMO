import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { NavigationAppBar } from "./navigation/appbar";
import { Sidebar } from "./navigation/sidebar";
import { VolumeView } from "./volume/volumeView";
import DashboardContainer from "./dashboard/dashboardContainer";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import ReportBuilder from "./reportBuilder/reportBuilder";
import { SettingsContainer } from "./settings/settingsContainer";
import { Login } from "./login/login";
import { ResetPassword } from "./login/resetPassword";
import { UserProvider, useUser } from "./userContext";
import { LoadingApollo } from "./reusableComponents/loadingApollo";
import { ActivateAccount } from "./accountActivation/activateAccount";

const drawerWidth = 240;

// Separate component for the main app layout
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // If we're on the login page, only render the login component
  if (
    location.pathname === "/login" ||
    location.pathname === "/reset-password"
  ) {
    return (
      <Box sx={{ p: 2 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Box>
    );
  }

  // Otherwise render the full app layout with navigation
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <NavigationAppBar
        toggleSidebar={toggleSidebar}
        isSidebarOpen={sidebarOpen}
      />
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
            <Route path="/" element={<DashboardContainer />} />
            <Route path="/report-builder" element={<ReportBuilder />} />
            <Route path="/volume" element={<VolumeView />} />
            <Route path="/settings" element={<SettingsContainer />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

// Auth check component
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, isCheckingAuth, isInitialDataLoading } = useUser();
  const location = useLocation();

  // If checking auth, show nothing
  if (isCheckingAuth) {
    return null;
  }

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // If logged in and trying to access login page, redirect to home
  if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  // Show loading screen only after successful login while loading initial data
  if (isInitialDataLoading) {
    return <LoadingApollo showProgressMessages={true} />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate-account" element={<ActivateAccount />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
};

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
