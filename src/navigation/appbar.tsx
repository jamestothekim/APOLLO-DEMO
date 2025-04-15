import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Box,
  Chip,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import InfoIcon from "@mui/icons-material/Info";
import { useUser } from "../userContext";
import { useNavigate } from "react-router-dom";
// --- Redux Imports ---
import { useDispatch } from "react-redux";
import { store } from "../redux/store"; // Import the store instance
import { resetGuidanceInitialization } from "../redux/userSettingsSlice"; // Import the reset action
import type { AppDispatch } from "../redux/store";
// ---------------------

interface AppBarProps {
  toggleSidebar: () => void;
}

export const NavigationAppBar = ({ toggleSidebar }: AppBarProps) => {
  // Get sync function from context
  const { logout, syncGuidanceSettings } = useUser();
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch(); // Get dispatch

  const handleLogout = async () => {
    try {
      // --- Sync Guidance Settings Before Logout --- START
      if (typeof syncGuidanceSettings === "function") {
        // Check if sync function exists

        // Get latest pending state directly from store
        const currentState = store.getState();
        const guidanceState = currentState.guidanceSettings;

        const payload = {
          guidance_settings: {
            summary_cols: guidanceState.pendingSummaryCols,
            summary_rows: guidanceState.pendingSummaryRows,
            forecast_cols: guidanceState.pendingForecastCols,
            forecast_rows: guidanceState.pendingForecastRows,
          },
        };

        // Call the sync function from the context
        await syncGuidanceSettings(payload);
        console.log("Guidance settings sync complete.");

        // Reset the Redux initialization flag
        dispatch(resetGuidanceInitialization());
      } else {
        console.warn("syncGuidanceSettings function not found in UserContext.");
      }
      // --- Sync Guidance Settings Before Logout --- END

      // Call original logout from context
      await logout();

      // Navigate to login
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error during logout process:", error);
      // Still attempt to navigate to login even if sync fails?
      // Or show an error message to the user?
      // For now, navigate anyway to ensure user is logged out visually
      navigate("/login", { replace: true });
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "background.paper",
        color: "text.primary",
      }}
    >
      <Toolbar>
        <IconButton
          sx={{
            marginRight: 2,
            color: (theme) => theme.palette.text.primary,
          }}
          aria-label="open drawer"
          onClick={toggleSidebar}
          edge="start"
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ color: (theme) => theme.palette.text.primary }}
        >
          APOLLO
        </Typography>
        <Chip
          label="PRE-RELEASE"
          size="small"
          sx={{
            ml: 1,
            border: (theme) => `1px solid ${theme.palette.primary.main}`,
            borderRadius: "16px",
            backgroundColor: "transparent",
            color: (theme) => theme.palette.primary.main,
          }}
        />
        <Tooltip
          title={`Pre-release 2 includes enhancements, bug fixes, and the ability to include guidance analysis in the volume module.`}
          arrow
        >
          <IconButton size="small" sx={{ ml: 0.5 }}>
            <InfoIcon fontSize="small" color="primary" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          aria-label="logout"
          onClick={handleLogout}
          sx={{ color: (theme) => theme.palette.text.primary }}
        >
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};
