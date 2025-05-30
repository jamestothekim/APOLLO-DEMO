import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useUser } from "../userContext";
import { useNavigate } from "react-router-dom";
import { ForgotPassword } from "./forgotPassword";

export const Login: React.FC = () => {
  const theme = useTheme();
  const { login, isLoggedIn } = useUser();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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

  // Show forgot password component if requested
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

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

        // Always redirect to dashboard on successful login
        navigate("/", { replace: true });
      } else {
        // This case might not be reachable if the backend always throws an error on failure
        console.warn(
          "Login failed - Server indicated failure but didn't throw an error."
        );
        setNotification({
          open: true,
          message: "Invalid email or password", // Generic message if no error thrown
          severity: "error",
        });
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      let message = "An error occurred during login";
      // Check if the error has a response from the server (axios error)
      if (error.response && error.response.data) {
        // const errorCode = error.response.data.code; // Removed unused variable
        const serverMessage = error.response.data.message;

        // Use the server's message directly, which includes attempt warnings and lockout info
        message = serverMessage || "Invalid email or password";

        // You could potentially use the code for more specific UI changes if needed
        // switch (errorCode) {
        //   case 'ACCOUNT_LOCKED':
        //     // Maybe disable the form temporarily
        //     break;
        //   case 'INVALID_CREDENTIALS_WARNING':
        //     // Highlight remaining attempts
        //     break;
        //   default:
        //     // Generic invalid credentials
        //     break;
        // }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setNotification({
        open: true,
        message: message,
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
          <img
            src="https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO.png"
            alt="APOLLO Logo"
            style={{
              height: "100px", // Adjust height as needed
              width: "auto", // Maintain aspect ratio
              marginBottom: theme.spacing(2),
            }}
          />

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
                mb: 1,
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

            <Box sx={{ textAlign: "right", mb: 1 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPassword(true);
                }}
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                  fontSize: "0.8em",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

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
                fontSize: ".85em",
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
