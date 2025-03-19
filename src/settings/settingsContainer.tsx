import { Box, Divider } from "@mui/material";
import { UserSettingsContainer } from "./userSettings/userSettingsContainer";
import { AdminSettingsContainer } from "./adminSettings/adminSettingsContainer";
import { useUser } from "../userContext";

export const SettingsContainer = () => {
  const { user } = useUser();

  return (
    <Box>
      <UserSettingsContainer />
      {user?.user_access?.Admin && (
        <>
          <Box sx={{ mt: 4, mb: 2 }}>
            <Divider />
          </Box>
          <AdminSettingsContainer />
        </>
      )}
    </Box>
  );
};
