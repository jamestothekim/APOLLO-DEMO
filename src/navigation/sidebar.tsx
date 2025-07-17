import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Collapse,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LinkIcon from "@mui/icons-material/Link";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useNavigate } from "react-router-dom";
import { useUser } from "../userContext";
import { useState } from "react";
import { ALLOWED_MARKETING_ACCESS } from "../marketingPlanner/marketingPlayData/marketingData";

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
  const [chainsExpanded, setChainsExpanded] = useState(true);

  const mainNavigationItems: NavItem[] = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    {
      text: "Report Builder",
      icon: <AccountBalanceWalletIcon />,
      path: "/report-builder",
    },
    { text: "Volume", icon: <ShowChartIcon />, path: "/volume" },
  ];

  const chainsItems: NavItem[] = [
    { text: "Volume", icon: <ShowChartIcon />, path: "/chains/volume" },
    ...(user?.user_access?.Admin
      ? [{ text: "Scans", icon: <CalendarMonthIcon />, path: "/scan-planner" }]
      : []),
  ];

  const marketingItems: NavItem[] = [
    ...(user?.email &&
    ALLOWED_MARKETING_ACCESS.allowedEmails.includes(user.email)
      ? [
          {
            text: "Marketing",
            icon: <CampaignIcon />,
            path: "/marketing",
          },
        ]
      : []),
  ];

  const bottomNavigationItems: NavItem[] = [
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during sidebar logout process:", error);
    }
  };

  const handleChainsClick = () => {
    setChainsExpanded(!chainsExpanded);
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
          {/* Main Navigation Items */}
          {mainNavigationItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}

          {/* Chains Section - Only visible to admins */}
          {user?.user_access?.Admin && (
            <>
              <ListItem button onClick={handleChainsClick}>
                <ListItemIcon>
                  <LinkIcon />
                </ListItemIcon>
                <ListItemText primary="Chains" />
              </ListItem>

              {/* Collapsible Chains Items */}
              <Collapse in={chainsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {chainsItems.map((item) => (
                    <ListItem
                      button
                      key={item.text}
                      onClick={() => navigate(item.path)}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </>
          )}

          {/* Marketing Items */}
          {marketingItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}

          {/* Bottom Navigation Items */}
          {bottomNavigationItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
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
