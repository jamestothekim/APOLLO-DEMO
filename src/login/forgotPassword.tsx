import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setNotification({
        open: true,
        message: "Please enter your email address",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setNotification({
          open: true,
          message: data.message,
          severity: "success",
        });
        setEmail(""); // Clear the form
      } else {
        setNotification({
          open: true,
          message: data.message || "An error occurred. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setNotification({
        open: true,
        message: "Network error. Please check your connection and try again.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.background.default,
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          transform: "scale(0.8)",
          transformOrigin: "center",
          width: "100%",
          maxWidth: "400px",
          position: "relative",
        }}
      >
        <IconButton
          onClick={onBack}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: theme.palette.text.secondary,
          }}
          size="small"
        >
          <ArrowBack />
        </IconButton>

        <img
          src="https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO.png"
          alt="APOLLO Logo"
          style={{
            height: "80px",
            width: "auto",
            marginBottom: theme.spacing(2),
          }}
        />

        <Typography
          variant="h5"
          sx={{
            mb: 1,
            fontWeight: "bold",
            color: theme.palette.text.primary,
          }}
        >
          Reset Password
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: "center",
            color: theme.palette.text.secondary,
            lineHeight: 1.5,
          }}
        >
          Enter your email address and we'll send you a link to reset your
          password.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: theme.palette.primary.main,
                },
                "&:hover fieldset": {
                  borderColor: theme.palette.primary.main,
                },
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
            size="small"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="medium"
            disabled={isLoading}
            sx={{
              mt: 1,
              mb: 2,
              py: 1.2,
              backgroundColor: theme.palette.primary.main,
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
              "&:disabled": {
                backgroundColor: theme.palette.action.disabled,
              },
              fontWeight: "bold",
              fontSize: "0.9em",
            }}
          >
            {isLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Sending...
              </Box>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <Button
            onClick={onBack}
            fullWidth
            variant="text"
            size="small"
            disabled={isLoading}
            sx={{
              color: theme.palette.text.secondary,
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            Back to Sign In
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={8000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
