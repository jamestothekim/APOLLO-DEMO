import { AppBar, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

interface AppBarProps {
  toggleSidebar: () => void;
}

export const NavigationAppBar = ({ toggleSidebar }: AppBarProps) => {
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
      </Toolbar>
    </AppBar>
  );
};
