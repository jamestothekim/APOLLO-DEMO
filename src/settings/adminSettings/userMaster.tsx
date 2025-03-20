import { useEffect, useState } from "react";
import axios from "axios";
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
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as XIcon,
} from "@mui/icons-material";
import { useUser } from "../../userContext";

// Types
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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
  const { user, updateUser } = useUser();

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

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      const { user_access, ...basicInfo } = editingUser;
      const userData = { basicInfo, user_access };

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/users/admin/edit/${editingUser.id}`,
        userData
      );

      setUsers(
        users.map((user) => (user.id === editingUser.id ? editingUser : user))
      );

      if (editingUser.id === user?.id) {
        updateUser(response.data);
      }

      showSnackbar("User updated successfully", "success");
      handleCloseSidebar();
    } catch (error) {
      console.error("Error updating user:", error);
      showSnackbar("Failed to update user", "error");
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setEditingUser(null);
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

    if (field === "markets") {
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

  const columns = [
    {
      header: "Full Name",
      key: "fullName",
      render: (_: any, row: User) => `${row.first_name} ${row.last_name}`,
    },
    {
      header: "Email",
      key: "email",
    },
    {
      header: "Role",
      key: "role",
    },
    {
      header: "Division",
      key: "division",
      render: (_: any, row: User) => row.user_access?.Division || "-",
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
    },
    {
      header: "Admin",
      key: "admin",
      align: "center" as const,
      render: (_: any, row: User) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {row.user_access?.Admin === true ? (
            <CheckCircleIcon color="primary" />
          ) : (
            <XIcon sx={{ color: "text.disabled" }} />
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <DynamicTable data={users} columns={columns} onRowClick={handleEdit} />

      <QualSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        width="500px"
        title="Edit User"
        footerButtons={[
          {
            label: "Cancel",
            onClick: handleCloseSidebar,
            variant: "outlined",
          },
          {
            label: "Save Changes",
            onClick: handleSave,
            variant: "contained",
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
                  onChange={(e) => handleEditChange("admin", e.target.checked)}
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
    </Box>
  );
};

export default UserMaster;
