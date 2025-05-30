import React, { useState, useEffect } from "react";
import { Box, Typography, styled, keyframes } from "@mui/material";

// Define the spinning animation - Earth-like rotation
const spin = keyframes`
  0% {
    transform: rotateY(0deg) rotateX(0deg);
  }
  100% {
    transform: rotateY(360deg) rotateX(0deg);
  }
`;

// Define a pulse animation for extra visual appeal
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

// Define a fade animation for text transitions
const fadeInOut = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  20% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
`;

// Define a fade-in-only animation for the final message
const fadeInHold = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  20% { opacity: 1; transform: translateY(0); }
  100% { opacity: 1; transform: translateY(0); }
`;

// Define a wave animation for the dots
const dotWave = keyframes`
  0% { transform: scale(1); }
  33% { transform: scale(1.5); }
  66% { transform: scale(1); }
  100% { transform: scale(1); }
`;

// Styled components for the loading animation
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  position: "relative",
}));

const SpinningLogo = styled("img")({
  width: "120px",
  height: "120px",
  animation: `${spin} 4s linear infinite`,
  filter: "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15))",
  transformStyle: "preserve-3d",
});

const LogoContainer = styled(Box)({
  perspective: "1000px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const LoadingText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(3),
  color: theme.palette.text.secondary,
  fontWeight: 300,
  animation: `${pulse} 2s ease-in-out infinite`,
  letterSpacing: "0.5px",
}));

const SubText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.disabled,
  fontSize: "0.875rem",
  fontWeight: 300,
}));

const AnimatedSubText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isFinalMessage",
})<{ isFinalMessage?: boolean }>(({ theme, isFinalMessage }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.disabled,
  fontSize: "0.875rem",
  fontWeight: 300,
  animation: `${isFinalMessage ? fadeInHold : fadeInOut} 2s ease-in-out ${
    isFinalMessage ? "forwards" : "infinite"
  }`,
  minHeight: "1.5rem", // Prevent layout shifts
}));

// Background accent circles for visual appeal
const AccentCircle = styled(Box, {
  shouldForwardProp: (prop) => prop !== "delay",
})<{ delay?: number }>(({ theme, delay = 0 }) => ({
  position: "absolute",
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: "50%",
  opacity: 0.1,
  animation: `${spin} 8s linear infinite`,
  animationDelay: `${delay}s`,
}));

interface LoadingApolloProps {
  message?: string;
  subMessage?: string;
  showProgressMessages?: boolean;
}

export const LoadingApollo: React.FC<LoadingApolloProps> = ({
  message = "Loading APOLLO",
  subMessage = "Preparing your data...",
  showProgressMessages = false,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const progressMessages = [
    "Preparing your data...",
    "Loading data models...",
    "Setting up your configuration...",
    "All systems are GO...",
    "APOLLO is GO for launch...",
  ];

  useEffect(() => {
    if (!showProgressMessages) return;
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => {
        // Stop at the last message instead of cycling back
        if (prevIndex < progressMessages.length - 1) {
          return prevIndex + 1;
        }
        return prevIndex; // Hold at the last message
      });
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [showProgressMessages, progressMessages.length]);

  const displayMessage = showProgressMessages ? "Loading Apollo" : message;
  const displaySubMessage = showProgressMessages
    ? progressMessages[currentMessageIndex]
    : subMessage;

  return (
    <LoadingContainer>
      {/* Background accent circles */}
      <AccentCircle
        sx={{
          width: "300px",
          height: "300px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        delay={0}
      />
      <AccentCircle
        sx={{
          width: "200px",
          height: "200px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        delay={2}
      />

      {/* Main spinning logo */}
      <LogoContainer>
        <SpinningLogo
          src="https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO_LOGO.png"
          alt="Apollo Logo"
          onError={(e) => {
            // Fallback in case the image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
      </LogoContainer>

      {/* Loading text */}
      <LoadingText variant="h5">{displayMessage}</LoadingText>

      {/* Subtitle */}
      {showProgressMessages ? (
        <AnimatedSubText
          variant="body2"
          key={currentMessageIndex}
          isFinalMessage={currentMessageIndex === progressMessages.length - 1}
        >
          {displaySubMessage}
        </AnimatedSubText>
      ) : (
        <SubText variant="body2">{displaySubMessage}</SubText>
      )}

      {/* Loading dots animation */}
      <Box sx={{ mt: 2, display: "flex", gap: 0.5 }}>
        {[0, 1, 2].map((index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              animation: `${dotWave} 1.5s ease-in-out infinite`,
              animationDelay: `${index * 0.5}s`,
            }}
          />
        ))}
      </Box>
    </LoadingContainer>
  );
};

export default LoadingApollo;
