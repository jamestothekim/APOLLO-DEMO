import { Box, TextField } from "@mui/material";
import { Typography } from "@mui/material";
import { useUser } from "../../userContext";
import { useState, useMemo, useEffect } from "react";
import QualSidebar from "../../reusableComponents/qualSidebar";
import { DynamicForm, FieldConfig } from "../../reusableComponents/dynamicForm";
import { Stack } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import axios from "axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// Define the shape of user data
interface UserDataType {
  name: string;
  email: string;
  password: string;
  fullAddress: string; // For display
  address: string; // Individual fields
  city: string;
  state_code: string;
  zip: string;
  role: string;
  division: string | undefined;
  markets: string[]; // Original market list
  displayMarkets: string[]; // Markets formatted for display
  [key: string]: string | string[] | undefined; // Index signature for dynamic access
}

export const UserSettings = () => {
  const { user, checkAuth } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState({ current: "", new: "" });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const userData = useMemo<UserDataType>(() => {
    if (!user) return {} as UserDataType;

    // Construct fullAddress, filtering out empty parts
    const addressParts = [user.address, user.city, user.state_code].filter(
      (part) => part && part.trim() !== ""
    );
    let fullAddress = addressParts.join(", ");
    if (user.zip && user.zip.trim() !== "") {
      fullAddress = fullAddress ? `${fullAddress} ${user.zip}` : user.zip;
    }

    // Prepare markets for display (show 4 chips max before '+ X more')
    const allMarkets = user.user_access.Markets
      ? user.user_access.Markets.map((market) => market.market_code)
      : [];
    const displayMarkets =
      allMarkets.length > 4
        ? [...allMarkets.slice(0, 4), `+ ${allMarkets.length - 4} more`]
        : allMarkets;

    return {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      password: "********", // Static value for display
      fullAddress: fullAddress, // Use the constructed fullAddress
      address: user.address || "", // Default to empty string if null/undefined
      city: user.city || "",
      state_code: user.state_code || "",
      zip: user.zip || "",
      role: user.role,
      division: user.user_access.Division || "", // Default to empty string
      markets: allMarkets, // Keep the original list
      displayMarkets: displayMarkets, // Use this for the DynamicForm
    };
  }, [user]);

  const [editedValue, setEditedValue] = useState<UserDataType>(userData);

  // Update editedValue when userData changes
  useEffect(() => {
    setEditedValue(userData);
  }, [userData]);

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  const userFields: FieldConfig[] = [
    {
      name: "name",
      label: "Name",
      fieldType: "text",
      editable: true,
    },
    {
      name: "email",
      label: "Email",
      fieldType: "email",
      editable: true,
    },
    {
      name: "password",
      label: "Password",
      fieldType: "text",
      value: "********",
      editable: true,
    },
    {
      name: "fullAddress",
      label: "Address",
      fieldType: "text",
      editable: true,
    },
    {
      name: "role",
      label: "Role",
      fieldType: "text",
      editable: false,
    },
    {
      name: "division",
      label: "Division",
      fieldType: "text",
      editable: false,
    },
    {
      name: "displayMarkets",
      label: "Markets",
      fieldType: "chip",
      editable: false,
      chipProps: {
        size: "small",
        variant: "outlined",
        color: "primary",
        sx: {
          borderRadius: "16px",
          backgroundColor: "transparent",
          fontFamily: "theme.typography.fontFamily",
          "& .MuiChip-label": {
            px: 1,
          },
        },
      },
    },
  ];

  const handleEdit = () => {
    setEditedValue({ ...userData });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;

    const updatedUserData = {
      ...editedValue,
      first_name: editedValue.name.split(" ")[0],
      last_name: editedValue.name.split(" ")[1],
    };

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/users/settings/edit/${user.id}`,
        {
          ...updatedUserData,
          currentUser: user,
        }
      );

      await checkAuth(); // Refresh user context
      showSnackbar("Settings updated successfully", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      showSnackbar("Failed to update settings", "error");
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordError({ current: "", new: "" });
      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/change-password`,
        {
          userId: user.id,
          currentPassword,
          newPassword,
        }
      );

      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      showSnackbar("Password updated successfully", "success");
    } catch (error: any) {
      let errorMessage = "Failed to update password";
      let errorField = ""; // Track which field caused the error

      // Check for Axios error with response data
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
        const errorCode = error.response.data.code;

        // Determine which field is associated with the error
        if (errorCode === "PASSWORD_COMPLEXITY_FAILURE") {
          errorField = "new";
        } else if (
          errorMessage.toLowerCase().includes("current password is incorrect")
        ) {
          errorField = "current";
        }

        // Don't log expected validation errors (like 400/401) as console errors
        if (![400, 401].includes(error.response.status)) {
          console.error("Password change error:", error.response.data);
        }
      } else {
        // Log unexpected errors
        console.error("Password change error:", error);
      }

      // Update the passwordError state for the specific field
      setPasswordError({
        current: errorField === "current" ? errorMessage : "",
        new: errorField === "new" ? errorMessage : "",
      });
      showSnackbar(errorMessage, "error"); // Show specific error in Snackbar
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const footerButtons = [
    {
      label: "Cancel",
      onClick: () => {
        setIsEditing(false);
        setEditedValue({ ...userData });
      },
      variant: "outlined" as const,
    },
    {
      label: "Save Changes",
      onClick: handleSave,
      variant: "contained" as const,
      disabled: JSON.stringify(editedValue) === JSON.stringify(userData),
    },
  ];

  return (
    <Box>
      <DynamicForm fields={userFields} data={userData} onEdit={handleEdit} />

      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordError({ current: "", new: "" }); // Reset errors on close
        }}
      >
        <DialogTitle>Change Password</DialogTitle>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handlePasswordChange();
          }}
        >
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  // Clear error only for this field when user types
                  if (passwordError.current)
                    setPasswordError((prev) => ({ ...prev, current: "" }));
                }}
                error={!!passwordError.current} // Keep red outline logic
                helperText={" "} // Keep consistent spacing, but don't show error message
                // Remove FormHelperTextProps - helper text won't turn red
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  // Clear error only for this field when user types
                  if (passwordError.new)
                    setPasswordError((prev) => ({ ...prev, new: "" }));
                }}
                error={!!passwordError.new} // Keep red outline logic
                helperText={
                  "Must be at least 8 characters, include 1 uppercase letter, and 1 special character."
                } // Always show requirements, updated from 7 to 8
                // Remove FormHelperTextProps - helper text won't turn red
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setPasswordDialogOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setPasswordError({ current: "", new: "" }); // Reset errors on cancel
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit" // Make this button submit the form
              variant="contained"
              disabled={!currentPassword || !newPassword}
            >
              Submit
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <QualSidebar
        open={isEditing}
        onClose={() => {
          setIsEditing(false);
          setEditedValue({ ...userData });
        }}
        title="Edit User Settings"
        footerButtons={footerButtons}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Personal Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editedValue.name}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editedValue.email}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Password"
                    value="********"
                    disabled
                  />
                  <Button
                    variant="outlined"
                    onClick={() => setPasswordDialogOpen(true)}
                    sx={{ flexShrink: 0 }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Address
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={editedValue.address}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label="City"
                  value={editedValue.city}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label="State"
                  value={editedValue.state_code}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      state_code: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={editedValue.zip}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      zip: e.target.value,
                    }))
                  }
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
      </QualSidebar>
    </Box>
  );
};
