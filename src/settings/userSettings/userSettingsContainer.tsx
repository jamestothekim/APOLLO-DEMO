import { Paper, Typography, Box } from "@mui/material";
import { UserSettings } from "./userSettings";

export const UserSettingsContainer = () => {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        User Settings
      </Typography>
      <Box>
        <UserSettings />
      </Box>
    </Paper>
  );
};
