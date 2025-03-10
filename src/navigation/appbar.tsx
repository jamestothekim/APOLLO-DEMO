import { AppBar, IconButton, Toolbar, Typography, Box } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";

interface AppBarProps {
  toggleSidebar: () => void;
}

export const NavigationAppBar = ({ toggleSidebar }: AppBarProps) => {
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    window.location.reload();
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
          sx={{ color: (theme) => theme.palette.text.primary, flexGrow: 1 }}
        >
          APOLLO
        </Typography>
        <Box sx={{ flexGrow: 0 }}>
          <IconButton
            aria-label="logout"
            onClick={handleLogout}
            sx={{ color: (theme) => theme.palette.text.primary }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
