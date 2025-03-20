import { Box, Drawer, Typography } from "@mui/material";

interface RatesSidebarProps {
  open: boolean;
  onClose: () => void;
}

export const RatesSidebar = ({ open, onClose }: RatesSidebarProps) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: "600px",
        },
      }}
    >
      <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          Rate Details - Coming Soon
        </Typography>
      </Box>
    </Drawer>
  );
};
