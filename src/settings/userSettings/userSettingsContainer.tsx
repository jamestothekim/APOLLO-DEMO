import { Paper, Typography, Box } from "@mui/material";
import { UserSettings } from "./userSettings";

export const UserSettingsContainer = () => {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 500,
          color: (theme) => theme.palette.primary.main,
        }}
      >
        USER SETTINGS
      </Typography>
      <Box>
        <UserSettings />
      </Box>
    </Paper>
  );
};
