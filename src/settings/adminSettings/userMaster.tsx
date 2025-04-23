import { useEffect, useMemo, useState } from "react";
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
    Markets?: MarketOption[];
    Admin?: boolean;
  };
}

interface MarketOption {
  id: number;
  market: string;
  market_code: string;
}

// Type for the hierarchical market data
interface MarketsByDivision {
  [division: string]: {
    [team: string]: string[];
  };
}

// Constants for Roles
const EXECUTIVE_ROLE = "Executive";
const CORPORATE_FINANCE_ROLE = "Corporate Finance";
const REGIONAL_FINANCE_ROLE = "Regional Finance";
const DISTRIBUTOR_MANAGER_ROLE = "Distributor Manager";

// Hardcoded Roles as per user request
const FIXED_ROLES = [
  EXECUTIVE_ROLE,
  REGIONAL_FINANCE_ROLE,
  CORPORATE_FINANCE_ROLE, // Assuming Corporate Finance based on constant
  DISTRIBUTOR_MANAGER_ROLE,
];

// Main component
const UserMaster = () => {
  const { user: currentUser, checkAuth } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allMarkets, setAllMarkets] = useState<MarketOption[]>([]);
  const [marketsByDivision, setMarketsByDivision] =
    useState<MarketsByDivision | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [availableRoles] = useState<string[]>(FIXED_ROLES);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Fetch users, market data, roles, divisions, and hierarchical markets
  useEffect(() => {
    fetchUsers();
    fetchMarkets();
    fetchMarketsByDivision();
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
      setAllMarkets(formattedMarkets);
    } catch (error) {
      console.error("Error fetching all markets:", error);
      showSnackbar("Failed to fetch market list", "error");
    }
  };

  const fetchMarketsByDivision = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-markets-by-division`
      );
      setMarketsByDivision(response.data);
      // Derive available divisions from the fetched data
      if (response.data) {
        setAvailableDivisions(Object.keys(response.data));
      }
    } catch (error) {
      console.error("Error fetching markets by division:", error);
      showSnackbar("Failed to fetch division market data", "error");
    }
  };

  const handleEdit = (user: User) => {
    // Preprocess user data to align with current rules before editing
    let initialDivision = user.user_access?.Division ?? "";
    let initialMarkets = user.user_access?.Markets ?? [];
    const initialRole = user.role;
    const initialAdmin = user.user_access?.Admin ?? false;

    // Apply rules based on the loaded user's role and division
    if (
      initialRole === EXECUTIVE_ROLE ||
      initialRole === CORPORATE_FINANCE_ROLE
    ) {
      initialDivision = ""; // Enforce empty division
      initialMarkets = allMarkets; // Enforce all markets
    } else if (initialRole === REGIONAL_FINANCE_ROLE) {
      if (initialDivision && marketsByDivision) {
        // Enforce all markets for the *existing* division
        initialMarkets = getMarketOptionsForDivision(initialDivision);
      } else {
        initialDivision = ""; // Ensure division is empty if invalid/missing
        initialMarkets = []; // No division, so markets should be empty
      }
    } else if (initialRole === DISTRIBUTOR_MANAGER_ROLE) {
      if (initialDivision && marketsByDivision) {
        // Filter existing markets to only those valid for the division
        const divisionMarkets = getMarketOptionsForDivision(initialDivision);
        const validMarketCodes = new Set(
          divisionMarkets.map((m) => m.market_code)
        );
        initialMarkets = initialMarkets.filter((market) =>
          validMarketCodes.has(market.market_code)
        );
      } else {
        initialDivision = ""; // Ensure division is empty if invalid/missing
        initialMarkets = []; // No division, so markets should be empty
      }
    }
    // For other roles, keep the loaded data as is.

    const userToEdit = {
      ...user,
      // Use the potentially corrected values
      user_access: {
        Division: initialDivision,
        Markets: initialMarkets,
        Admin: initialAdmin,
      },
    };
    setEditingUser(userToEdit);
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

  const handleSave = async () => {
    if (!editingUser) return;
    const isNewUser = editingUser.id === 0;

    const finalMarkets = selectedMarketOptions;

    try {
      const url = isNewUser
        ? `${import.meta.env.VITE_API_URL}/users/create`
        : `${import.meta.env.VITE_API_URL}/users/admin/edit/${editingUser.id}`;

      const userData = {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        role: editingUser.role,
        address: editingUser.address || "",
        city: editingUser.city || "",
        state_code: editingUser.state_code || "",
        zip: editingUser.zip || "",
        user_access: {
          Division: editingUser.user_access?.Division || null,
          Markets: finalMarkets,
          Admin: editingUser.user_access?.Admin || false,
        },
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
      let errorMessage = `Failed to ${isNewUser ? "create" : "update"} user`;
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      }
      showSnackbar(errorMessage, "error");
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setEditingUser(null);
    setPasswordError("");
    setShowPassword(false);
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleEditChange = (
    field: keyof User | "markets" | "Admin" | "Division",
    value: any
  ) => {
    if (!editingUser) return;

    let updatedUser = { ...editingUser };

    if (field === "password" && editingUser.id === 0) {
      const validationError = validatePassword(value);
      setPasswordError(validationError);
      updatedUser = {
        ...updatedUser,
        [field]: value,
      };
    } else if (field === "markets") {
      const selectedMarkets = value as MarketOption[];
      updatedUser = {
        ...updatedUser,
        user_access: {
          ...updatedUser.user_access,
          Markets: selectedMarkets,
        },
      };
    } else if (field === "Division") {
      const newDivision = value as string | null;
      let marketsToSet: MarketOption[] = updatedUser.user_access?.Markets || [];

      if (
        updatedUser.role === REGIONAL_FINANCE_ROLE ||
        updatedUser.role === DISTRIBUTOR_MANAGER_ROLE
      ) {
        if (newDivision) {
          const divisionMarkets = getMarketOptionsForDivision(newDivision);
          if (updatedUser.role === REGIONAL_FINANCE_ROLE) {
            marketsToSet = divisionMarkets;
          } else {
            const validMarketCodes = new Set(
              divisionMarkets.map((m) => m.market_code)
            );
            marketsToSet = marketsToSet.filter((market) =>
              validMarketCodes.has(market.market_code)
            );
          }
        } else {
          marketsToSet = [];
        }
      }

      updatedUser = {
        ...updatedUser,
        user_access: {
          ...updatedUser.user_access,
          Division: newDivision ?? "",
          Markets: marketsToSet,
        },
      };
    } else if (field === "Admin") {
      updatedUser = {
        ...updatedUser,
        user_access: {
          ...updatedUser.user_access,
          Admin: value,
        },
      };
    } else if (field === "role") {
      const newRole = value as string;
      let marketsToSet: MarketOption[] = updatedUser.user_access?.Markets || [];
      let divisionToSet = updatedUser.user_access?.Division || "";

      if (newRole === EXECUTIVE_ROLE || newRole === CORPORATE_FINANCE_ROLE) {
        marketsToSet = allMarkets;
        divisionToSet = "";
      } else if (
        newRole === REGIONAL_FINANCE_ROLE ||
        newRole === DISTRIBUTOR_MANAGER_ROLE
      ) {
        const currentDivision = divisionToSet;
        if (currentDivision) {
          const validMarketNames = getMarketNamesForDivision(currentDivision);
          marketsToSet = marketsToSet.filter((market) =>
            validMarketNames.includes(market.market)
          );
        } else {
          marketsToSet = [];
        }
      } else {
        marketsToSet = updatedUser.user_access?.Markets || [];
      }

      updatedUser = {
        ...updatedUser,
        role: newRole,
        user_access: {
          ...updatedUser.user_access,
          Division: divisionToSet,
          Markets: marketsToSet,
        },
      };
    } else {
      updatedUser = {
        ...updatedUser,
        [field]: value,
      };
    }

    setEditingUser(updatedUser);

    if (field !== "password") {
      setPasswordError("");
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

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
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) {
      return "Password must contain at least one special character.";
    }
    return "";
  };

  const handleDelete = async () => {
    if (!editingUser) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/users/delete/${editingUser.id}`
      );

      await fetchUsers();

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

  const getMarketNamesForDivision = (division: string): string[] => {
    if (!marketsByDivision || !division || !marketsByDivision[division]) {
      return [];
    }
    let marketNames: string[] = [];
    const teams = marketsByDivision[division];
    Object.values(teams).forEach((marketsInTeam) => {
      marketNames = marketNames.concat(marketsInTeam);
    });
    return marketNames;
  };

  const getMarketOptionsForDivision = (division: string): MarketOption[] => {
    const marketNames = getMarketNamesForDivision(division);
    return allMarkets.filter((market) => marketNames.includes(market.market));
  };

  const availableMarketsForSelection = useMemo((): MarketOption[] => {
    if (!editingUser || !editingUser.role || !allMarkets.length) {
      return [];
    }

    const role = editingUser.role;
    const division = editingUser.user_access?.Division;

    if (role === EXECUTIVE_ROLE || role === CORPORATE_FINANCE_ROLE) {
      return allMarkets;
    } else if (
      (role === REGIONAL_FINANCE_ROLE || role === DISTRIBUTOR_MANAGER_ROLE) &&
      division &&
      marketsByDivision
    ) {
      return getMarketOptionsForDivision(division);
    }

    return [];
  }, [editingUser, allMarkets, marketsByDivision]);

  const selectedMarketOptions = useMemo((): MarketOption[] => {
    if (!editingUser?.user_access?.Markets || !allMarkets.length) {
      return [];
    }
    const selectedMarketCodes = new Set(
      editingUser.user_access.Markets.map((m) => m.market_code)
    );
    return allMarkets.filter((market) =>
      selectedMarketCodes.has(market.market_code)
    );
  }, [editingUser?.user_access?.Markets, allMarkets]);

  const columns: Column[] = [
    {
      header: "Full Name",
      key: "fullName",
      render: (_: any, row: User) => `${row.first_name} ${row.last_name}`,
      sortable: true,
      sortAccessor: (row: User) => `${row.first_name} ${row.last_name}`,
      sx: { width: 140 },
    },
    {
      header: "Email",
      key: "email",
      sortable: true,
      sx: { width: 200 },
    },
    {
      header: "Role",
      key: "role",
      sortable: true,
      sx: { width: 150 },
    },
    {
      header: "Division",
      key: "division",
      render: (_: any, row: User) => {
        if (
          row.role === EXECUTIVE_ROLE ||
          row.role === CORPORATE_FINANCE_ROLE
        ) {
          return "WGS - All";
        }
        return row.user_access?.Division || "-";
      },
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Division,
      sx: { width: 190 },
    },
    {
      header: "Markets",
      key: "markets",
      render: (_: any, row: User) => {
        const role = row.role;
        const division = row.user_access?.Division;
        const selectedMarkets = row.user_access?.Markets || [];
        const numSelected = selectedMarkets.length;

        let displayLabel = "";

        if (role === EXECUTIVE_ROLE || role === CORPORATE_FINANCE_ROLE) {
          if (numSelected === allMarkets.length && allMarkets.length > 0) {
            displayLabel = "WGS - All";
          } else if (numSelected > 0) {
            displayLabel = "";
          }
        } else if (
          division &&
          (role === REGIONAL_FINANCE_ROLE || role === DISTRIBUTOR_MANAGER_ROLE)
        ) {
          const marketsForDivision = getMarketOptionsForDivision(division);
          if (
            numSelected === marketsForDivision.length &&
            marketsForDivision.length > 0
          ) {
            displayLabel = `${division} - All`;
          } else if (numSelected > 0) {
            displayLabel = "";
          }
        } else if (numSelected > 0) {
          displayLabel = "";
        }

        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {displayLabel === "" && numSelected > 0
              ? selectedMarkets.map((market) => (
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
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                ))
              : displayLabel !== "-" && (
                  <Chip
                    label={displayLabel}
                    size="small"
                    sx={{
                      borderRadius: "16px",
                      backgroundColor: "transparent",
                      border: "1px solid",
                      borderColor: "primary.main",
                      color: "primary.main",
                      fontFamily: "theme.typography.fontFamily",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                )}
          </Box>
        );
      },
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Markets?.length ?? 0,
      sx: { width: 250 },
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
            <XIcon color="error" />
          )}
        </Box>
      ),
      sortable: true,
      sortAccessor: (row: User) => (row.user_access?.Admin ? 1 : 0),
      sx: { width: 80 },
    },
  ];

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
          {
            label: "Cancel",
            onClick: handleCloseSidebar,
            variant: "outlined" as const,
          },
          {
            label: editingUser?.id === 0 ? "Create User" : "Save Changes",
            onClick: handleSave,
            variant: "contained" as const,
            disabled:
              editingUser?.id === 0 &&
              (!editingUser?.password || !!passwordError),
          },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Personal Information & Role
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
                  onChange={(_, newValue) =>
                    handleEditChange("role", newValue ?? "")
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Role" size="small" />
                  )}
                />
                <Autocomplete
                  options={availableDivisions}
                  value={
                    editingUser?.role === EXECUTIVE_ROLE ||
                    editingUser?.role === CORPORATE_FINANCE_ROLE
                      ? "WGS - All"
                      : editingUser?.user_access?.Division || ""
                  }
                  onChange={(_, newValue) =>
                    handleEditChange("Division", newValue)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Division"
                      size="small"
                      placeholder={
                        editingUser?.role === EXECUTIVE_ROLE ||
                        editingUser?.role === CORPORATE_FINANCE_ROLE
                          ? "WGS - All"
                          : ""
                      }
                    />
                  )}
                  disabled={
                    !availableDivisions.length ||
                    editingUser?.role === EXECUTIVE_ROLE ||
                    editingUser?.role === CORPORATE_FINANCE_ROLE
                  }
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                Market Access
              </Typography>
              <Stack spacing={2}>
                <Autocomplete
                  multiple
                  options={availableMarketsForSelection}
                  getOptionLabel={(option) =>
                    `${option.market} (${option.market_code})`
                  }
                  value={selectedMarketOptions}
                  onChange={(_, newValue) => {
                    handleEditChange("markets", newValue);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.market_code === value.market_code
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Markets"
                      size="small"
                      helperText={
                        (editingUser?.role === REGIONAL_FINANCE_ROLE ||
                          editingUser?.role === DISTRIBUTOR_MANAGER_ROLE) &&
                        !editingUser?.user_access?.Division
                          ? "Select a Division to enable market selection"
                          : ""
                      }
                    />
                  )}
                  renderTags={(value, getTagProps) => {
                    const numSelected = value.length;
                    const role = editingUser?.role;
                    const division = editingUser?.user_access?.Division;

                    let chipLabel = "";
                    let showSummaryChip = false;

                    if (
                      role === EXECUTIVE_ROLE ||
                      role === CORPORATE_FINANCE_ROLE
                    ) {
                      if (
                        numSelected === allMarkets.length &&
                        allMarkets.length > 0
                      ) {
                        chipLabel = "WGS - All";
                        showSummaryChip = true;
                      }
                    } else if (
                      division &&
                      (role === REGIONAL_FINANCE_ROLE ||
                        role === DISTRIBUTOR_MANAGER_ROLE)
                    ) {
                      const marketsForDivision =
                        getMarketOptionsForDivision(division);
                      if (
                        numSelected === marketsForDivision.length &&
                        marketsForDivision.length > 0
                      ) {
                        chipLabel = `${division} - All`;
                        showSummaryChip = true;
                      }
                    }

                    if (showSummaryChip) {
                      return [
                        <Chip
                          key="summary-chip"
                          label={chipLabel}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />,
                      ];
                    } else if (numSelected > 3) {
                      const firstOption = value[0];
                      chipLabel = `${firstOption.market} (${
                        firstOption.market_code
                      }) + ${numSelected - 1} more`;
                      return [
                        <Chip
                          key="summary-chip"
                          label={chipLabel}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />,
                      ];
                    } else {
                      return value.map((option, index) => {
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
                      });
                    }
                  }}
                  disabled={
                    !marketsByDivision ||
                    ((editingUser?.role === REGIONAL_FINANCE_ROLE ||
                      editingUser?.role === DISTRIBUTOR_MANAGER_ROLE) &&
                      !editingUser?.user_access?.Division)
                  }
                />
              </Stack>
            </Box>

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
                  onChange={(e) => handleEditChange("Admin", e.target.checked)}
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
