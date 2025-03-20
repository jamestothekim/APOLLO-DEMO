import { Box, Paper, Typography } from "@mui/material";

export const Dashboard = () => {
  return (
    <Paper elevation={3}>
      <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          Dashboard - Coming Soon
        </Typography>
      </Box>
    </Paper>
  );
};
