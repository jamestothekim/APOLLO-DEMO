import { useState } from "react";
import { Box } from "@mui/material";
import { Summary } from "./summary";
import { LoadingProgress } from "../reusableComponents/loadingProgress";
import { VolumeForecast } from "./volumeForecast";

export const VolumeView = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Box sx={{ position: "relative" }}>
      {isLoading && (
        <Box sx={{ height: "80vh" }}>
          <LoadingProgress onComplete={() => setIsLoading(false)} />
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          visibility: isLoading ? "hidden" : "visible",
        }}
      >
        <Summary onLoadingComplete={() => setIsLoading(false)} />
        <VolumeForecast />
      </Box>
    </Box>
  );
};
