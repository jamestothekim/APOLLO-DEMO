import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Lock as LockIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useUser } from "../userContext";

interface UserDataType {
  name: string;
  email: string;
  fullAddress: string;
  address: string;
  city: string;
  state_code: string;
  zip: string;
  role: string;
  division: string | undefined;
  markets: string[];
  displayMarkets: string[];
  phone_number: string | null;
  two_fa_enabled: boolean;
  phone_verified: boolean;
}

export const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useUser();
  const token = searchParams.get("token");

  const [userData, setUserData] = useState<UserDataType | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info",
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [editedValue, setEditedValue] = useState<UserDataType | null>(null);

  useEffect(() => {
    if (!token) {
      showSnackbar("Invalid activation link", "error");
      navigate("/login");
      return;
    }

    // Fetch user data using the activation token
    const fetchUserData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/verify-activation/${token}`
        );
        const user = response.data.user;

        // Format user data similar to UserSettings component
        const addressParts = [user.address, user.city, user.state_code].filter(
          (part) => part && part.trim() !== ""
        );
        let fullAddress = addressParts.join(", ");
        if (user.zip && user.zip.trim() !== "") {
          fullAddress = fullAddress ? `${fullAddress} ${user.zip}` : user.zip;
        }

        const allMarkets = user.user_access.Markets
          ? user.user_access.Markets.map(
              (market: { market_code: string }) => market.market_code
            )
          : [];
        const displayMarkets =
          allMarkets.length > 4
            ? [...allMarkets.slice(0, 4), `+ ${allMarkets.length - 4} more`]
            : allMarkets;

        const formattedUserData = {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          fullAddress,
          address: user.address || "",
          city: user.city || "",
          state_code: user.state_code || "",
          zip: user.zip || "",
          role: user.role,
          division: user.user_access.Division || "",
          markets: allMarkets,
          displayMarkets,
          phone_number: user.phone_number || null,
          two_fa_enabled: user.two_fa_enabled || false,
          phone_verified: user.phone_verified || false,
        };

        setUserData(formattedUserData);
        setEditedValue(formattedUserData);
        setPhoneNumber(user.phone_number || "");
      } catch (error) {
        console.error("Error fetching user data:", error);
        showSnackbar("Invalid or expired activation link", "error");
        navigate("/login");
      }
    };

    fetchUserData();
  }, [token, navigate]);

  const handleActivate = async () => {
    if (!userData || !editedValue) return;

    // Validate required fields
    const requiredFields = {
      name: editedValue.name.trim(),
      address: editedValue.address.trim(),
      city: editedValue.city.trim(),
      state_code: editedValue.state_code.trim(),
      zip: editedValue.zip.trim(),
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key.replace("_", " "));

    if (missingFields.length > 0) {
      showSnackbar(
        `Please fill in all required fields: ${missingFields.join(", ")}`,
        "error"
      );
      return;
    }

    // Validate password
    if (!password) {
      showSnackbar("Please enter a password", "error");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      showSnackbar("Passwords do not match", "error");
      return;
    }

    if (!validatePasswordComplexity(password)) {
      setPasswordError(
        "Password must be at least 8 characters long, contain at least one uppercase letter, and at least one special character"
      );
      showSnackbar(
        "Password must be at least 8 characters long, contain at least one uppercase letter, and at least one special character",
        "error"
      );
      return;
    }

    try {
      const [firstName, lastName] = editedValue.name.split(" ");

      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/activate-account`,
        {
          token,
          password,
          first_name: firstName,
          last_name: lastName,
          email: editedValue.email,
          address: editedValue.address,
          city: editedValue.city,
          state_code: editedValue.state_code,
          zip: editedValue.zip,
          phone_number: phoneNumber,
          two_fa_enabled: twoFaEnabled,
        }
      );

      showSnackbar("Account activated successfully", "success");
      await checkAuth();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error activating account:", error);
      showSnackbar("Failed to activate account", "error");
    }
  };

  const handlePhoneNumberChange = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/2fa/send-phone-verification`,
        { phoneNumber }
      );

      if (response.data.success) {
        setVerificationDialogOpen(true);
        showSnackbar("Verification code sent successfully", "success");
      }
    } catch (error) {
      showSnackbar("Failed to send verification code", "error");
    }
  };

  const handleVerificationButtonClick = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/2fa/verify-phone`,
        {
          phoneNumber,
          code: verificationCode,
        }
      );

      if (response.data.success) {
        setVerificationDialogOpen(false);
        setVerificationCode("");
        showSnackbar("Phone number verified successfully", "success");
        setPhoneVerified(true);
      }
    } catch (error) {
      console.error("Error during verification:", error);
      showSnackbar("Verification failed. Please try again.", "error");
    }
  };

  const validatePasswordComplexity = (password: string) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info"
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // Password strength helper
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", value: 33, color: "error" };
    if (score === 3 || score === 4)
      return { label: "Medium", value: 66, color: "warning" };
    if (score === 5) return { label: "Strong", value: 100, color: "success" };
    return { label: "", value: 0, color: "primary" };
  };

  if (!userData || !editedValue) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 800,
          width: "100%",
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 5,
          }}
        >
          <img
            src="https://apollo-s3-media.s3.amazonaws.com/logo/APOLLO.png"
            alt="APOLLO Logo"
            style={{
              height: "100px",
              width: "auto",
              marginBottom: "24px",
            }}
          />
          <Typography variant="h5" color="primary" sx={{ fontWeight: "bold" }}>
            Activate Your Account
          </Typography>
        </Box>

        <Stack spacing={5}>
          <Box>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonIcon fontSize="small" />
              Personal Information
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", ml: 0.5 }}
              >
                (Required)
              </Typography>
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Name"
                value={editedValue.name}
                onChange={(e) =>
                  setEditedValue((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
              <TextField
                fullWidth
                label="Street Address"
                value={editedValue.address}
                onChange={(e) =>
                  setEditedValue((prev) =>
                    prev ? { ...prev, address: e.target.value } : null
                  )
                }
              />
              <TextField
                fullWidth
                label="City"
                value={editedValue.city}
                onChange={(e) =>
                  setEditedValue((prev) =>
                    prev ? { ...prev, city: e.target.value } : null
                  )
                }
              />
              <TextField
                fullWidth
                label="State"
                value={editedValue.state_code}
                onChange={(e) =>
                  setEditedValue((prev) =>
                    prev ? { ...prev, state_code: e.target.value } : null
                  )
                }
              />
              <TextField
                fullWidth
                label="ZIP Code"
                value={editedValue.zip}
                onChange={(e) =>
                  setEditedValue((prev) =>
                    prev ? { ...prev, zip: e.target.value } : null
                  )
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <LockIcon fontSize="small" />
              Set Password
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", ml: 0.5 }}
              >
                (Required)
              </Typography>
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                error={!!passwordError}
                helperText={
                  passwordError ||
                  "Must be at least 8 characters, include 1 uppercase letter, and 1 special character."
                }
              />
              {/* Password Strength Bar */}
              {password && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={getPasswordStrength(password).value}
                    color={getPasswordStrength(password).color as any}
                    sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: `${getPasswordStrength(password).color}.main`,
                    }}
                  >
                    Password Strength: {getPasswordStrength(password).label}
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                error={!!passwordError}
              />
            </Stack>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <SecurityIcon fontSize="small" />
              Set Up Two Factor Authentication
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", ml: 0.5 }}
              >
                (Recommended)
              </Typography>
            </Typography>
            <Stack spacing={3}>
              <Box
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneVerified(false);
                      }}
                      placeholder="Enter phone number"
                      InputProps={{
                        startAdornment: (
                          <ShieldIcon sx={{ color: "text.secondary", mr: 1 }} />
                        ),
                        endAdornment: phoneVerified && (
                          <CheckCircleIcon color="primary" sx={{ ml: 1 }} />
                        ),
                      }}
                    />
                    {!phoneVerified && phoneNumber && (
                      <Button
                        variant="outlined"
                        onClick={handlePhoneNumberChange}
                        disabled={!phoneNumber}
                        sx={{ flexShrink: 0 }}
                      >
                        Verify
                      </Button>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1,
                      bgcolor: twoFaEnabled
                        ? "secondary.light"
                        : "action.hover",
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <SecurityIcon
                        fontSize="small"
                        color={twoFaEnabled ? "secondary" : "action"}
                      />
                      Two-Factor Authentication
                    </Typography>
                    <Button
                      variant={twoFaEnabled ? "contained" : "outlined"}
                      color={twoFaEnabled ? "error" : "secondary"}
                      onClick={() => setTwoFaEnabled(!twoFaEnabled)}
                      disabled={!phoneVerified}
                      size="small"
                    >
                      {twoFaEnabled ? "Disable" : "Enable"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              <PersonIcon fontSize="small" />
              User Access
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", ml: 0.5 }}
              >
                (Admin Only)
              </Typography>
              <Tooltip
                title="If you believe your access information is incorrect, please contact your system administrator to request a change."
                arrow
                placement="top"
              >
                <InfoIcon
                  fontSize="small"
                  sx={{ color: "text.secondary", cursor: "help" }}
                />
              </Tooltip>
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Role"
                value={userData.role}
                disabled
              />
              <TextField
                fullWidth
                label="Division"
                value={userData.division}
                disabled
              />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Markets
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {userData.displayMarkets.map((market, index) => (
                    <Box
                      key={index}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "16px",
                        border: "1px solid",
                        borderColor: "primary.main",
                        color: "primary.main",
                        bgcolor: "transparent",
                        fontSize: "0.875rem",
                      }}
                    >
                      {market}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Stack>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleActivate}
            fullWidth
          >
            Activate Account
          </Button>
        </Stack>
      </Paper>

      <Dialog
        open={verificationDialogOpen}
        onClose={() => {
          setVerificationDialogOpen(false);
          setVerificationCode("");
        }}
      >
        <DialogTitle>Verify Phone Number</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the verification code sent to your phone number.
            </Typography>
            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              inputProps={{ maxLength: 6 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setVerificationDialogOpen(false);
              setVerificationCode("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleVerificationButtonClick}
            disabled={!verificationCode}
          >
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
