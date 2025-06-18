import React, { useState } from "react";
import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUser } from "../userContext";
import { useNavigate, Link } from "react-router-dom";

// ---------------------

interface AppBarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const NavigationAppBar = ({
  toggleSidebar,
  isSidebarOpen,
}: AppBarProps) => {
  const { logout, user } = useUser();
  const navigate = useNavigate();

  // State for Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Menu handlers
  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    navigate("/settings");
    handleMenuClose();
  };

  // Helper function to get initials
  const getInitials = (
    firstName: string | undefined,
    lastName: string | undefined
  ): string => {
    const firstInitial = firstName
      ? firstName.trim().charAt(0).toUpperCase()
      : "";
    const lastInitial = lastName ? lastName.trim().charAt(0).toUpperCase() : "";
    const initials = `${firstInitial}${lastInitial}`;
    return initials.length > 0 ? initials : "?"; // Return combined initials or ?
  };

  const handleLogout = async () => {
    try {
      // Call original logout from context
      await logout();

      // Navigate to login
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error during logout process:", error);
      navigate("/login", { replace: true });
    }
  };

  const handleLogoutClick = () => {
    handleLogout();
    handleMenuClose();
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
          {isSidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
            <img
              src="https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO_LOGO.png"
              alt="APOLLO Logo"
              style={{ height: "30px", marginRight: "7px" }}
            />
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                lineHeight: 1,
              }}
            >
              {" "}
              <Typography
                variant="h6"
                sx={{ fontSize: "1rem", marginRight: "-2px" }}
                component="div"
              >
                APOLLO
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "primary.main",
                  fontSize: "0.50rem",
                  textTransform: "uppercase",
                  marginTop: "-7px",
                }}
              >
                BETA
              </Typography>
            </Box>
          </Box>
        </Link>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mr: 1 }}>
          <img
            src="https://apollo-s3-media.s3.us-east-1.amazonaws.com/client_logos/WGLogo.png"
            alt="Client Logo"
            style={{ height: "20px", display: "block" }}
          />
          {user && (
            <IconButton
              onClick={handleAvatarClick}
              size="small"
              sx={{ ml: 0.5 }}
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 32,
                  height: 32,
                  fontSize: "0.875rem",
                }}
              >
                {getInitials(user.first_name, user.last_name)}
              </Avatar>
            </IconButton>
          )}
        </Box>

        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              "&::before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "translateY(-50%) rotate(45deg)",
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleLogoutClick}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Log Out</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
