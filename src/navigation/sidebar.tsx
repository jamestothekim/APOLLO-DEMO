import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Chip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useNavigate } from "react-router-dom";
import { useUser } from "../userContext";

interface SidebarProps {
  isOpen: boolean;
  drawerWidth: number;
  onClose: () => void;
}

interface NavItem {
  text: string;
  icon: JSX.Element;
  path: string;
}

export const Sidebar = ({ isOpen, drawerWidth, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const { logout, user } = useUser();

  const navigationItems: (NavItem | false)[] = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    {
      text: "Report Builder",
      icon: <AccountBalanceWalletIcon />,
      path: "/report-builder",
    },
    { text: "Volume", icon: <ShowChartIcon />, path: "/volume" },
    user?.user_access?.Admin && {
      text: "Scan Planner",
      icon: <CalendarMonthIcon />,
      path: "/scan-planner",
    },
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
  ];

  const visibleItems = navigationItems.filter((i): i is NavItem => Boolean(i));

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during sidebar logout process:", error);
    }
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={isOpen}
      onClose={onClose}
      sx={{
        width: isOpen ? drawerWidth : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          backgroundColor: "background.paper",
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Toolbar />
        <List>
          {visibleItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
              {item.text === "Scan Planner" && (
                <Chip
                  label="PROTO"
                  color="secondary"
                  size="small"
                  sx={{ borderRadius: 4, ml: 1, fontSize: "0.65em" }}
                />
              )}
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <List>
          <ListItem button key="logout" onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Log Out" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};
