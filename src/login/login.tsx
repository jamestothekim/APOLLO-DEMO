import React, { useState, useEffect } from "react";
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
import { useNavigate, useLocation } from "react-router-dom";

export const Login: React.FC = () => {
  const theme = useTheme();
  const { login, isLoggedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, this component shouldn't be shown
  useEffect(() => {
    if (isLoggedIn) {
      // Store login state in localStorage for persistence across page refreshes
      localStorage.setItem("isAuthenticated", "true");
    }
  }, [isLoggedIn]);

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
      const success = await login(formData.email, formData.password);

      if (success) {
        setNotification({
          open: true,
          message: "Login successful!",
          severity: "success",
        });

        // Get the intended destination or default to "/"
        const from = (location.state as any)?.from?.pathname || "/";
        navigate(from, { replace: true });
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
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              sx={{
                mb: 1.5,
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
                  "& input:-webkit-autofill": {
                    WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
                    WebkitTextFillColor: theme.palette.text.primary,
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
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
                  "& input:-webkit-autofill": {
                    WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
                    WebkitTextFillColor: theme.palette.text.primary,
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
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
