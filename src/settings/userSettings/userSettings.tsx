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
  markets: string[];
  [key: string]: string | string[] | undefined; // Index signature for dynamic access
}

export const UserSettings = () => {
  const { user, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const userData = useMemo<UserDataType>(() => {
    if (!user) return {} as UserDataType;
    return {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      password: "********", // Static value for display
      fullAddress: `${user.address}, ${user.city}, ${user.state_code} ${user.zip}`,
      address: user.address,
      city: user.city,
      state_code: user.state_code,
      zip: user.zip,
      role: user.role,
      division: user.user_access.Division,
      markets: user.user_access.Markets
        ? user.user_access.Markets.map((market) => market.market_code)
        : [],
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
      name: "markets",
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

    // Add logging to track the save process
    console.log("Attempting to save user settings...");
    console.log("Current user ID:", user.id);
    console.log("Updated user data:", updatedUserData);

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/users/settings/edit/${user.id}`,
        updatedUserData,
        { withCredentials: true }
      );

      console.log("User settings saved successfully.");
      await refreshUser();
      showSnackbar("Settings updated successfully", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      showSnackbar("Failed to update settings", "error");
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordError("");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/change-password`,
        {
          userId: user.id,
          currentPassword,
          newPassword,
        },
        { withCredentials: true }
      );

      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      // Type the error
      setPasswordError(
        error.response?.data?.message || "Failed to update password"
      );
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
        onClose={() => setPasswordDialogOpen(false)}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={!!passwordError}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {passwordError && (
              <Typography color="error" variant="body2">
                {passwordError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPasswordDialogOpen(false);
              setCurrentPassword("");
              setNewPassword("");
              setPasswordError("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={!currentPassword || !newPassword}
          >
            Submit
          </Button>
        </DialogActions>
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
