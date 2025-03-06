import { Box, Divider } from "@mui/material";
import { UserSettingsContainer } from "./userSettings/userSettingsContainer";
import { AdminSettingsContainer } from "./adminSettings/adminSettingsContainer";

export const SettingsContainer = () => {
  return (
    <Box>
      <UserSettingsContainer />
      <Box sx={{ mt: 4, mb: 2 }}>
        <Divider />
      </Box>
      <AdminSettingsContainer />
    </Box>
  );
};
