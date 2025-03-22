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

interface AppBarProps {
  toggleSidebar: () => void;
}

export const NavigationAppBar = ({ toggleSidebar }: AppBarProps) => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
          title={`Pre-release 1 includes personal and admin settings, volume forecasting, undo, and saving your work. Initial work on dashboarding and visualizations has commenced but will be further developed.`}
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
