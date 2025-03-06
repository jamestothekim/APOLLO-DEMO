import { Box } from "@mui/material";
import { Summary } from "./summary";
import { VolumeForecast } from "./volumeForecast";

export const VolumeView = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Summary />
      <VolumeForecast />
    </Box>
  );
};
