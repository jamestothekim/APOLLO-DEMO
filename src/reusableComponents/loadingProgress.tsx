import { Box, LinearProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Pulling your data...",
  "Loading the model...",
  "And making it look pretty...",
  "APOLLO",
];

interface LoadingProgressProps {
  onComplete: () => void;
  dataReady?: boolean;
}

export const LoadingProgress = ({
  onComplete,
  dataReady = true,
}: LoadingProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        // Progress moves steadily to 95%, then waits for data
        if (oldProgress >= 95 && !dataReady) {
          return oldProgress;
        }

        const newProgress = Math.min(oldProgress + 1.5, 100);

        // Update message based on progress
        const newIndex = Math.floor(
          (newProgress / 100) * LOADING_MESSAGES.length
        );
        if (newIndex !== messageIndex) {
          setMessageIndex(newIndex);
        }

        // Only complete when data is ready and we've reached 100%
        if (dataReady && newProgress === 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
        }

        return newProgress;
      });
    }, 50);

    return () => {
      clearInterval(timer);
    };
  }, [onComplete, messageIndex, dataReady]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          maxWidth: 400,
          width: "100%",
          p: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{ mb: 2, textAlign: "center", color: "primary.main" }}
        >
          {LOADING_MESSAGES[messageIndex]}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography
          variant="body2"
          sx={{ mt: 1, textAlign: "right", color: "text.secondary" }}
        >
          {`${Math.round(progress)}%`}
        </Typography>
      </Box>
    </Box>
  );
};
