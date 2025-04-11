import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  drawerWidth: number;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, drawerWidth, onClose }: SidebarProps) => {
  const navigate = useNavigate();

  const navigationItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    {
      text: "Report Builder",
      icon: <AccountBalanceWalletIcon />,
      path: "/report-builder",
    },
    { text: "Volume", icon: <ShowChartIcon />, path: "/volume" },
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
  ];

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
      <Toolbar />
      <List>
        {navigationItems.map((item) => (
          <ListItem button key={item.text} onClick={() => navigate(item.path)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};
