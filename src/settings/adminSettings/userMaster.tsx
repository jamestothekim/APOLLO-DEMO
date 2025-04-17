import { useEffect, useState } from "react";
import { DynamicTable } from "../../reusableComponents/dynamicTable";
import QualSidebar from "../../reusableComponents/qualSidebar";
import {
  Box,
  Chip,
  Switch,
  TextField,
  Typography,
  Autocomplete,
  Stack,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as XIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useUser } from "../../userContext";
import type { Column } from "../../reusableComponents/dynamicTable";

// Types
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  password?: string;
  address?: string;
  city?: string;
  state_code?: string;
  zip?: string;
  user_access?: {
    Division?: string;
    Markets?: {
      id: number;
      market: string;
      market_code: string;
    }[];
    Admin?: boolean;
  };
}

interface MarketOption {
  id: number;
  market: string;
  market_code: string;
}

// Main component
const UserMaster = () => {
  const { user: currentUser, checkAuth } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availableMarkets, setAvailableMarkets] = useState<MarketOption[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Fetch users and market data
  useEffect(() => {
    fetchUsers();
    fetchMarkets();
    fetchAccessRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users/users`
      );
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showSnackbar("Failed to fetch users", "error");
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/get-states`
      );
      const formattedMarkets = response.data.map((market: any) => ({
        id: market.id,
        market: market.market_name,
        market_code: market.market_code,
      }));
      setAvailableMarkets(formattedMarkets);
    } catch (error) {
      console.error("Error fetching markets:", error);
      showSnackbar("Failed to fetch markets", "error");
    }
  };

  const fetchAccessRoles = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-access-roles`
      );
      setAvailableRoles(response.data.roles);
      setAvailableDivisions(response.data.divisions);
    } catch (error) {
      console.error("Error fetching access roles:", error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setSidebarOpen(true);
  };

  const handleAdd = () => {
    setEditingUser({
      id: 0,
      first_name: "",
      last_name: "",
      email: "",
      role: "",
      user_access: {
        Division: "",
        Markets: [],
        Admin: false,
      },
    });
    setSidebarOpen(true);
  };

  const handleAdminSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      user_access: {
        ...editingUser.user_access,
        Admin: e.target.checked,
      },
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const isNewUser = editingUser.id === 0;

    try {
      const url = isNewUser
        ? `${import.meta.env.VITE_API_URL}/users/create`
        : `${import.meta.env.VITE_API_URL}/users/admin/edit/${editingUser.id}`;

      // Restructure the data to match what the backend expects
      const userData = {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        role: editingUser.role,
        address: editingUser.address || "",
        city: editingUser.city || "",
        state_code: editingUser.state_code || "",
        zip: editingUser.zip || "",
        user_access: editingUser.user_access,
        ...(isNewUser && editingUser.password
          ? { password: editingUser.password }
          : {}),
      };

      if (isNewUser) {
        await axios.post(url, userData);
      } else {
        await axios.put(url, userData);
      }

      await fetchUsers();

      // If the updated user is the currently logged-in user, refresh user context
      if (currentUser && editingUser.id === currentUser.id) {
        await checkAuth();
      }

      showSnackbar(
        `User ${isNewUser ? "created" : "updated"} successfully`,
        "success"
      );
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
      showSnackbar(
        `Failed to ${isNewUser ? "create" : "update"} user`,
        "error"
      );
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setEditingUser(null);
    setPasswordError(""); // Reset password error on close
    setShowPassword(false); // Reset password visibility on close
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleEditChange = (
    field: keyof User | "markets" | "admin" | "Division",
    value: any
  ) => {
    if (!editingUser) return;

    // Validate password if the field is 'password' and it's a new user
    if (field === "password" && editingUser.id === 0) {
      const validationError = validatePassword(value);
      setPasswordError(validationError);
      setEditingUser({
        ...editingUser,
        [field]: value,
      });
    } else if (field === "markets") {
      setEditingUser({
        ...editingUser,
        user_access: {
          ...editingUser.user_access,
          Markets: value, // Now receiving full market objects
        },
      });
    } else if (field === "Division" || field === "admin") {
      setEditingUser({
        ...editingUser,
        user_access: {
          ...editingUser.user_access,
          [field]: value,
        },
      });
    } else {
      setEditingUser({
        ...editingUser,
        [field]: value,
      });
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?"; // Expanded charset
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Password validation function
  const validatePassword = (password: string): string => {
    if (!password) {
      return "Password is required.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    // Using a broader set of special characters based on generatePassword
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) {
      return "Password must contain at least one special character.";
    }
    return ""; // No error
  };

  const columns: Column[] = [
    {
      header: "Full Name",
      key: "fullName",
      render: (_: any, row: User) => `${row.first_name} ${row.last_name}`,
      sortable: true,
      sortAccessor: (row: User) => `${row.first_name} ${row.last_name}`,
      sx: { width: 180 },
    },
    {
      header: "Email",
      key: "email",
      sortable: true,
      sx: { width: 220 },
    },
    {
      header: "Role",
      key: "role",
      sortable: true,
      sx: { width: 140 },
    },
    {
      header: "Division",
      key: "division",
      width: 200,
      render: (_: any, row: User) => row.user_access?.Division || "-",
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Division,
      sx: { width: 100 },
    },
    {
      header: "Markets",
      key: "markets",
      render: (_: any, row: User) => (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {row.user_access?.Markets?.map((market) => (
            <Chip
              key={market.market_code}
              label={market.market_code}
              size="small"
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                border: "1px solid",
                borderColor: "primary.main",
                color: "primary.main",
                fontFamily: "theme.typography.fontFamily",
                "& .MuiChip-label": {
                  px: 1,
                },
              }}
            />
          ))}
        </Box>
      ),
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Markets?.length ?? 0,
      sx: { width: 250 },
    },
    {
      header: "Admin",
      key: "admin",
      width: 80,
      align: "center" as const,
      render: (_: any, row: User) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {row.user_access?.Admin === true ? (
            <CheckCircleIcon color="primary" />
          ) : (
            <XIcon color="error" />
          )}
        </Box>
      ),
      sortable: true,
      sortAccessor: (row: User) =>
        row.user_access?.Admin === true
          ? 1
          : row.user_access?.Admin === false
          ? 0
          : null,
      sx: { width: 80 },
    },
  ];

  const handleDelete = async () => {
    if (!editingUser) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/users/delete/${editingUser.id}`
      );

      await fetchUsers();

      // If the deleted user is the current user, refresh auth state
      if (currentUser && editingUser.id === currentUser.id) {
        await checkAuth();
      }

      showSnackbar("User deleted successfully", "success");
      setDeleteConfirmOpen(false);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      showSnackbar("Failed to delete user", "error");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={handleAdd}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          Add User
        </Button>
      </Box>

      <DynamicTable
        data={users}
        columns={columns}
        onRowClick={handleEdit}
        fixedLayout={true}
      />

      <QualSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        width="500px"
        title={editingUser?.id === 0 ? "Add New User" : "Edit User"}
        footerButtons={[
          // Delete button (for existing users)
          ...(editingUser?.id !== 0
            ? [
                {
                  label: "Delete",
                  onClick: () => setDeleteConfirmOpen(true),
                  variant: "outlined" as const,
                  color: "error" as const,
                },
              ]
            : []),
          // Standard buttons
          {
            label: "Cancel",
            onClick: handleCloseSidebar,
            variant: "outlined" as const,
          },
          {
            label: editingUser?.id === 0 ? "Create User" : "Save Changes",
            onClick: handleSave,
            variant: "contained" as const,
            // Disable Create User if password is empty or invalid for new users
            disabled:
              editingUser?.id === 0 &&
              (!editingUser?.password || !!passwordError),
          },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            {/* Basic Information Section */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Personal Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="First Name"
                  size="small"
                  value={editingUser?.first_name || ""}
                  onChange={(e) =>
                    handleEditChange("first_name", e.target.value)
                  }
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  size="small"
                  value={editingUser?.last_name || ""}
                  onChange={(e) =>
                    handleEditChange("last_name", e.target.value)
                  }
                  fullWidth
                />
                <TextField
                  label="Email"
                  size="small"
                  value={editingUser?.email || ""}
                  onChange={(e) => handleEditChange("email", e.target.value)}
                  fullWidth
                />
                {editingUser?.id === 0 && (
                  <Box
                    sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                  >
                    <TextField
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      size="small"
                      value={editingUser?.password || ""}
                      onChange={(e) =>
                        handleEditChange("password", e.target.value)
                      }
                      error={!!passwordError}
                      helperText={
                        passwordError || "Min 8 chars, 1 uppercase, 1 special."
                      }
                      fullWidth
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              onMouseDown={(e) => e.preventDefault()}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const newPassword = generatePassword();
                        handleEditChange("password", newPassword);
                        setPasswordError("");
                        setShowPassword(true);
                      }}
                      sx={{ whiteSpace: "nowrap", height: "40px" }}
                    >
                      Generate
                    </Button>
                  </Box>
                )}
                <Autocomplete
                  options={availableRoles}
                  value={editingUser?.role || ""}
                  onChange={(_, newValue) => handleEditChange("role", newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Role" size="small" />
                  )}
                />
                <Autocomplete
                  options={availableDivisions}
                  value={editingUser?.user_access?.Division || ""}
                  onChange={(_, newValue) =>
                    handleEditChange("Division", newValue)
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Division" size="small" />
                  )}
                />
              </Stack>
            </Box>

            {/* Markets Section */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Markets
              </Typography>
              <Stack spacing={2}>
                <Autocomplete
                  multiple
                  options={availableMarkets}
                  getOptionLabel={(option) =>
                    `${option.market} (${option.market_code})`
                  }
                  value={
                    availableMarkets.filter((market) =>
                      editingUser?.user_access?.Markets?.some(
                        (userMarket) =>
                          userMarket.market_code === market.market_code
                      )
                    ) || []
                  }
                  onChange={(_, newValue) => {
                    handleEditChange(
                      "markets",
                      newValue.map((v) => ({
                        id: v.id,
                        market: v.market,
                        market_code: v.market_code,
                      }))
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Markets"
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...otherProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={`${option.market} (${option.market_code})`}
                          {...otherProps}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })
                  }
                />
              </Stack>
            </Box>

            {/* Permissions Section */}
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Permissions
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography>Admin Access</Typography>
                <Switch
                  checked={editingUser?.user_access?.Admin === true}
                  onChange={handleAdminSwitchChange}
                  color="primary"
                />
              </Box>
            </Box>
          </Stack>
        </Box>
      </QualSidebar>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {editingUser?.first_name}{" "}
          {editingUser?.last_name}? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserMaster;
