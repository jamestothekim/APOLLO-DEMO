import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useUser } from "../userContext";

export const Login: React.FC = () => {
  const theme = useTheme();
  const { login } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(formData.username, formData.password);

      if (success) {
        setNotification({
          open: true,
          message: "Login successful!",
          severity: "success",
        });
      } else {
        setNotification({
          open: true,
          message: "Invalid email or password",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setNotification({
        open: true,
        message: "An error occurred during login",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCreateAccount = async () => {
    try {
      const response = await fetch(
        "https://api.apollo.illysium.ai/users/create-dummy-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Using default values from the backend
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setNotification({
          open: true,
          message: "Dummy account created successfully!",
          severity: "success",
        });
        console.log("Account created:", data);

        // Auto-fill the login form with the created account credentials
        if (data.user && data.user.email) {
          setFormData({
            username: data.user.email,
            password: "password", // Default password from backend
          });
        }
      } else {
        setNotification({
          open: true,
          message: data.error || "Failed to create account",
          severity: "error",
        });
        console.error("Error creating account:", data);
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setNotification({
        open: true,
        message: "Network error occurred",
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  console.log("Login component rendering", theme);

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
      <Container maxWidth="xs">
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
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{
              mb: 2,
              color: theme.palette.primary.main,
              fontWeight: "bold",
            }}
          >
            APOLLO
          </Typography>

          <Typography
            component="h2"
            variant="h6"
            sx={{
              mb: 2,
              color: theme.palette.text.primary,
            }}
          >
            Sign In
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Email"
              name="username"
              autoComplete="email"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              sx={{ mb: 1.5 }}
              size="small"
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="medium"
              disabled={isLoading}
              sx={{
                mt: 1.5,
                mb: 1.5,
                py: 1,
                backgroundColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                fontWeight: "bold",
              }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="medium"
              onClick={handleCreateAccount}
              disabled={isLoading}
              sx={{
                mt: 0.5,
                mb: 1.5,
                py: 1,
                borderColor: theme.palette.secondary.main,
                color: theme.palette.secondary.main,
                "&:hover": {
                  borderColor: theme.palette.secondary.dark,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              Create Account
            </Button>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
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
