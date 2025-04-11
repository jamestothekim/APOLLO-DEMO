import { Box, Paper, Typography } from "@mui/material";

const ReportBuilder = () => {
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
          Report Builder - Coming Soon
        </Typography>
      </Box>
    </Paper>
  );
};

export default ReportBuilder;
