import React, { useState, useEffect } from "react";
import { Box, Typography, styled, keyframes } from "@mui/material";

// Keyframe animations
const spin = keyframes`
  to { transform: rotateY(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const fadeTransition = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  20%, 80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
`;

// Styled components
const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  position: "relative",
}));

const Logo = styled("img")<{ duration: number }>(({ duration }) => ({
  width: 120,
  height: 120,
  animation: `${spin} ${duration}s linear infinite`,
  filter: "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15))",
  transformStyle: "preserve-3d",
  transition: "animation-duration 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
}));

const LogoWrapper = styled(Box)({
  perspective: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const Title = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(3),
  color: theme.palette.text.secondary,
  fontWeight: 300,
  animation: `${pulse} 2s ease-in-out infinite`,
  letterSpacing: "0.5px",
}));

const Subtitle = styled(Typography)<{ animated?: boolean }>(
  ({ theme, animated }) => ({
    marginTop: theme.spacing(1),
    color: theme.palette.text.disabled,
    fontSize: "0.875rem",
    fontWeight: 300,
    minHeight: animated ? "1.5rem" : "auto",
    animation: animated ? `${fadeTransition} 2s ease-in-out infinite` : "none",
  })
);

const AccentRing = styled(Box)<{ size: number; delay: number }>(
  ({ theme, size, delay }) => ({
    position: "absolute",
    width: size,
    height: size,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: "50%",
    opacity: 0.1,
    animation: `${spin} 8s linear infinite`,
    animationDelay: `${delay}s`,
  })
);

const LoadingDot = styled(Box)<{ delay: number }>(({ delay }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: "primary.main",
  animation: `${pulse} 1.5s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

// Component props
interface LoadingApolloProps {
  message?: string;
  subMessage?: string;
  showProgressMessages?: boolean;
}

// Constants
const PROGRESS_MESSAGES = [
  "Preparing your data...",
  "Loading your configuration...",
  "All systems GO...",
  "APOLLO is a GO",
];

const APOLLO_LOGO_URL =
  "https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO_LOGO.png";

export const LoadingApollo: React.FC<LoadingApolloProps> = ({
  message = "Loading Apollo",
  subMessage = "Preparing your data...",
  showProgressMessages = false,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time for smooth acceleration
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Cycle through progress messages
  useEffect(() => {
    if (!showProgressMessages) return;
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [showProgressMessages]);

  // Calculate spinning speed with exponential acceleration
  const getSpinDuration = (): number => {
    if (!showProgressMessages) return 4;
    const progress = Math.min(elapsedTime / 8, 1);
    return Math.max(4 * Math.pow(1 - progress, 2) + 0.5 * progress, 0.5);
  };

  const displayMessage = showProgressMessages ? "Loading Apollo" : message;
  const displaySubMessage = showProgressMessages
    ? PROGRESS_MESSAGES[messageIndex]
    : subMessage;

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
  };

  return (
    <Container>
      {/* Background accent rings */}
      <AccentRing size={300} delay={0} />
      <AccentRing size={200} delay={2} />

      {/* Spinning logo */}
      <LogoWrapper>
        <Logo
          src={APOLLO_LOGO_URL}
          alt="Apollo Logo"
          duration={getSpinDuration()}
          onError={handleLogoError}
        />
      </LogoWrapper>

      {/* Loading text */}
      <Title variant="h5">{displayMessage}</Title>

      <Subtitle
        variant="body2"
        animated={showProgressMessages}
        key={showProgressMessages ? messageIndex : 0}
      >
        {displaySubMessage}
      </Subtitle>

      {/* Loading dots */}
      <Box sx={{ mt: 2, display: "flex", gap: 0.5 }}>
        {[0, 1, 2].map((index) => (
          <LoadingDot key={index} delay={index * 0.3} />
        ))}
      </Box>
    </Container>
  );
};

export default LoadingApollo;
