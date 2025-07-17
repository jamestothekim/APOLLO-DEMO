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
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useUser } from "../userContext";
import { useNavigate } from "react-router-dom";
import { ForgotPassword } from "./forgotPassword";
import axios from "axios";

export const Login: React.FC = () => {
  const theme = useTheme();
  const { isLoggedIn, login } = useUser();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  // If already logged in, this component shouldn't be shown
  useEffect(() => {
    if (isLoggedIn) {
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
      if (requiresTwoFactor) {
        // Demo 2FA - accept any 6-digit code
        if (formData.twoFactorCode && formData.twoFactorCode.length === 6) {
          const success = await login(formData.email, formData.password);

          if (success) {
            setNotification({
              open: true,
              message: "Login successful!",
              severity: "success",
            });
            navigate("/", { replace: true });
            return;
          } else {
            setNotification({
              open: true,
              message: "Login failed after verification. Please try again.",
              severity: "error",
            });
          }
        } else {
          setNotification({
            open: true,
            message:
              "Please enter a 6-digit verification code (any digits work for demo)",
            severity: "error",
          });
        }
      } else {
        // Demo login - check credentials against demo data
        const { DEMO_CREDENTIALS } = await import("../playData/demoConfig");

        if (
          (formData.email === DEMO_CREDENTIALS.email &&
            formData.password === DEMO_CREDENTIALS.password) ||
          (formData.email === DEMO_CREDENTIALS.admin.email &&
            formData.password === DEMO_CREDENTIALS.admin.password)
        ) {
          const success = await login(formData.email, formData.password);

          if (success) {
            setNotification({
              open: true,
              message: "Login successful!",
              severity: "success",
            });
            navigate("/", { replace: true });
          } else {
            setNotification({
              open: true,
              message: "Login failed. Please try again.",
              severity: "error",
            });
          }
        } else {
          setNotification({
            open: true,
            message: "Invalid credentials. Use demo@apollo.com / demo123",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);

      let message = "An error occurred during login";

      if (error.response?.data) {
        message = error.response.data.message || "Invalid credentials";
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
              height: "100px",
              width: "auto",
              marginBottom: theme.spacing(2),
            }}
          />

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            {!requiresTwoFactor ? (
              <>
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
                    onClick={() => setShowForgotPassword(true)}
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
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ mb: 2, textAlign: "center" }}>
                  Enter the verification code sent to your phone
                </Typography>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="twoFactorCode"
                  label="Verification Code"
                  value={formData.twoFactorCode}
                  onChange={handleChange}
                  size="small"
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
                    },
                  }}
                />
              </>
            )}

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
              {isLoading
                ? "Verifying..."
                : requiresTwoFactor
                ? "Verify Code"
                : "Sign In"}
            </Button>

            {requiresTwoFactor && (
              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={() => setRequiresTwoFactor(false)}
                sx={{ mt: 1 }}
              >
                Back to Login
              </Button>
            )}
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
