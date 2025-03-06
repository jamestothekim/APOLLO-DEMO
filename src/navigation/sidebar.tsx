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
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CampaignIcon from "@mui/icons-material/Campaign";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import PaidIcon from "@mui/icons-material/Paid";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
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
      text: "P&L Model",
      icon: <AccountBalanceWalletIcon />,
      path: "/P&LModel",
    },
    { text: "Volume", icon: <ShowChartIcon />, path: "/volume" },
    { text: "Discounts", icon: <LocalOfferIcon />, path: "/discounts" },
    { text: "Rates", icon: <PaidIcon />, path: "/rates" },
    { text: "A&P", icon: <CampaignIcon />, path: "/marketing" },
    { text: "Overhead", icon: <GroupIcon />, path: "/overhead" },
    { text: "Data Explorer", icon: <AnalyticsIcon />, path: "/data-explorer" },
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
