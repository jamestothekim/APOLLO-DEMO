import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as XIcon,
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
  address?: string;
  city?: string;
  state_code?: string;
  zip?: string;
  user_access?: {
    Division?: string;
    Markets?: MarketOption[];
    Admin?: boolean;
    Status?: "pending" | "active";
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
const FINANCE_ROLE = "Finance";
const MARKET_MANAGER_ROLE = "Market Manager";
const CORPORATE_DIVISION_LABEL = "Corporate";
const WGS_ALL_LABEL = "WGS - All";

// Hardcoded Roles as per user request
const FIXED_ROLES = [EXECUTIVE_ROLE, FINANCE_ROLE, MARKET_MANAGER_ROLE];

// Define the type for the exposed handle
export interface UserMasterHandle {
  handleAdd: () => void;
}

// Main component wrapped with forwardRef
const UserMaster = forwardRef<UserMasterHandle>((_props, ref) => {
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

  // Define available divisions including the "Corporate" option for Finance role
  const divisionsForAutocomplete = useMemo(() => {
    if (editingUser?.role === FINANCE_ROLE) {
      return [CORPORATE_DIVISION_LABEL, ...availableDivisions];
    }
    return availableDivisions;
  }, [editingUser?.role, availableDivisions]);

  // Expose the handleAdd function via the ref
  useImperativeHandle(ref, () => ({
    handleAdd,
  }));

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

    // --- Logic Adjustment for consolidated Finance role ---
    if (initialRole === EXECUTIVE_ROLE) {
      initialDivision = CORPORATE_DIVISION_LABEL;
      initialMarkets = allMarkets;
    } else if (initialRole === FINANCE_ROLE) {
      // If it's Finance role, check the division.
      // "Corporate" means all markets, actual division means markets for that division.
      if (initialDivision === CORPORATE_DIVISION_LABEL) {
        initialMarkets = allMarkets;
      } else if (initialDivision && marketsByDivision) {
        initialMarkets = getMarketOptionsForDivision(initialDivision);
      } else {
        // Default to Corporate if division is missing or invalid for Finance
        initialDivision = CORPORATE_DIVISION_LABEL;
        initialMarkets = allMarkets;
      }
    } else if (initialRole === MARKET_MANAGER_ROLE) {
      // Distributor Manager logic remains largely the same, but ensure division exists
      if (initialDivision && marketsByDivision) {
        const divisionMarkets = getMarketOptionsForDivision(initialDivision);
        const validMarketCodes = new Set(
          divisionMarkets.map((m) => m.market_code)
        );
        initialMarkets = initialMarkets.filter((market) =>
          validMarketCodes.has(market.market_code)
        );
        // If after filtering, no markets are left (e.g., division changed), reset markets
        if (initialMarkets.length === 0 && divisionMarkets.length > 0) {
          // Decide if you want to default to all markets for the division or keep empty
          // initialMarkets = divisionMarkets; // Option: Default to all division markets
        }
      } else {
        initialDivision = ""; // Ensure division is empty if invalid/missing
        initialMarkets = []; // No division, so markets should be empty
      }
    }
    // For other roles (if any added later), keep the loaded data as is.

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
          Status: isNewUser
            ? "pending"
            : editingUser.user_access?.Status || "active",
        },
      };

      if (isNewUser) {
        const response = await axios.post(url, userData);
        // Send activation email
        if (response.data.success) {
          showSnackbar(
            `User created successfully. An activation email has been sent to ${editingUser.email}`,
            "success"
          );
        }
      } else {
        await axios.put(url, userData);
        showSnackbar("User updated successfully", "success");
      }

      await fetchUsers();

      if (currentUser && editingUser.id === currentUser.id) {
        await checkAuth();
      }

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

    if (field === "markets") {
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
      let marketsToSet: MarketOption[] = [];

      if (updatedUser.role === FINANCE_ROLE) {
        if (newDivision === CORPORATE_DIVISION_LABEL) {
          marketsToSet = allMarkets;
        } else if (newDivision) {
          marketsToSet = getMarketOptionsForDivision(newDivision);
        }
      } else if (updatedUser.role === MARKET_MANAGER_ROLE) {
        marketsToSet = []; // Clear markets, user must re-select
      } else {
        marketsToSet = updatedUser.user_access?.Markets || [];
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

      if (newRole === EXECUTIVE_ROLE) {
        marketsToSet = allMarkets;
        divisionToSet = CORPORATE_DIVISION_LABEL;
      } else if (newRole === FINANCE_ROLE) {
        divisionToSet = CORPORATE_DIVISION_LABEL;
        marketsToSet = allMarkets;
      } else if (newRole === MARKET_MANAGER_ROLE) {
        const currentDivision = divisionToSet;
        if (currentDivision && marketsByDivision?.[currentDivision]) {
          const divisionMarkets = getMarketOptionsForDivision(currentDivision);
          const validMarketCodes = new Set(
            divisionMarkets.map((m) => m.market_code)
          );
          marketsToSet = marketsToSet.filter((m) =>
            validMarketCodes.has(m.market_code)
          );
          if (marketsToSet.length === 0) marketsToSet = [];
        } else {
          divisionToSet = "";
          marketsToSet = [];
        }
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

    if (role === EXECUTIVE_ROLE) {
      return allMarkets;
    } else if (role === FINANCE_ROLE) {
      // Finance can select markets only if a non-Corporate division is chosen
      if (
        division &&
        division !== CORPORATE_DIVISION_LABEL &&
        marketsByDivision
      ) {
        return getMarketOptionsForDivision(division);
      } else if (division === CORPORATE_DIVISION_LABEL) {
        // If Corporate is selected, technically all markets are assigned,
        // but the dropdown should be disabled or show "WGS - All"
        return allMarkets; // Or return [] and disable? Let's return all and disable/manage display in component
      }
    } else if (role === MARKET_MANAGER_ROLE && division && marketsByDivision) {
      return getMarketOptionsForDivision(division);
    }

    return []; // Default to empty if no division/role match allows selection
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
      filterable: true,
      sortAccessor: (row: User) => `${row.first_name} ${row.last_name}`,
      sx: { width: 140 },
    },
    {
      header: "Email",
      key: "email",
      sortable: true,
      filterable: true,
      sx: { width: 200 },
    },
    {
      header: "Role",
      key: "role",
      sortable: true,
      filterable: true,
      sx: { width: 150 },
    },
    {
      header: "Division",
      key: "division",
      filterable: true,
      render: (_: any, row: User) => {
        if (
          row.role === EXECUTIVE_ROLE ||
          (row.role === FINANCE_ROLE &&
            row.user_access?.Division === CORPORATE_DIVISION_LABEL)
        ) {
          return CORPORATE_DIVISION_LABEL;
        }
        // Display the actual division name otherwise, or '-' if none
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

        let displayLabel = "-"; // Default to '-'
        let showIndividualChips = false;

        if (role === EXECUTIVE_ROLE) {
          displayLabel = WGS_ALL_LABEL; // Executive always gets all
        } else if (role === FINANCE_ROLE) {
          if (division === CORPORATE_DIVISION_LABEL) {
            displayLabel = WGS_ALL_LABEL; // Finance + Corporate gets all
          } else if (division && marketsByDivision) {
            // Finance + Specific Division gets all markets *for that division*
            const marketsForDivision = getMarketOptionsForDivision(division);
            if (
              numSelected === marketsForDivision.length &&
              marketsForDivision.length > 0
            ) {
              displayLabel = `${division} - All`;
            } else if (numSelected > 0) {
              // displayLabel = ""; // Old: Show individual chips
              showIndividualChips = true; // New: Flag to show individual chips
              displayLabel = ""; // Clear label if showing chips
            }
          }
        } else if (
          role === MARKET_MANAGER_ROLE &&
          division &&
          marketsByDivision
        ) {
          // Distributor Manager can have specific markets within their division
          const marketsForDivision = getMarketOptionsForDivision(division);
          if (
            numSelected === marketsForDivision.length &&
            marketsForDivision.length > 0
          ) {
            displayLabel = `${division} - All`;
          } else if (numSelected > 0) {
            // displayLabel = ""; // Old: Show individual chips
            showIndividualChips = true; // New: Flag to show individual chips
            displayLabel = ""; // Clear label if showing chips
          }
        }
        // Fallback if numSelected is 0, displayLabel remains "-"

        // Determine chips to render
        const MAX_CHIPS = 4;
        const chipsToRender = showIndividualChips
          ? selectedMarkets.slice(0, MAX_CHIPS)
          : [];
        const remainingCount = showIndividualChips
          ? numSelected - chipsToRender.length
          : 0;

        return (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {/* Render summary label if applicable */}{" "}
            {displayLabel && displayLabel !== "-" && (
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
            {/* Render individual chips up to MAX_CHIPS */}{" "}
            {chipsToRender.map((market) => (
              <Chip
                key={market.market_code}
                label={market.market_code} // Display market_code for brevity
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
            ))}
            {/* Render "+ X more" if needed */}{" "}
            {remainingCount > 0 && (
              <Chip
                label={`+ ${remainingCount} more`}
                size="small"
                sx={{
                  ml: 0.5,
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
            {/* Render '-' if no label and no chips */}{" "}
            {!displayLabel && !showIndividualChips && numSelected === 0 && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                -
              </Typography>
            )}
          </Box>
        );
      },
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Markets?.length ?? 0,
      sx: { width: 250 },
    },
    {
      header: "Status",
      key: "status",
      render: (_: any, row: User) => {
        const status =
          row.user_access?.Status === "pending" ? "Pending" : "Active";
        return (
          <Chip
            label={status}
            size="small"
            color={status === "Active" ? "primary" : "primary"}
            variant={status === "Active" ? "filled" : "outlined"}
            sx={{
              borderRadius: "16px",
              backgroundColor:
                status === "Active" ? "primary.main" : "transparent",
              border: status === "Active" ? "none" : "1px solid",
              borderColor: "primary.main",
              color: status === "Active" ? "white" : "primary.main",
              fontFamily: "theme.typography.fontFamily",
              "& .MuiChip-label": { px: 1 },
            }}
          />
        );
      },
      sortable: true,
      sortAccessor: (row: User) =>
        row.user_access?.Status === "pending" ? 0 : 1,
      sx: { width: 120 },
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
            <XIcon color="secondary" />
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
      <DynamicTable
        data={users}
        columns={columns}
        onRowClick={handleEdit}
        enableColumnFiltering
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
                  options={divisionsForAutocomplete} // Use the dynamic list
                  value={
                    // Handle display for Executive and Finance/Corporate explicitly
                    editingUser?.role === EXECUTIVE_ROLE
                      ? CORPORATE_DIVISION_LABEL // Value is "Corporate" for Executive
                      : editingUser?.role === FINANCE_ROLE &&
                        editingUser?.user_access?.Division ===
                          CORPORATE_DIVISION_LABEL
                      ? CORPORATE_DIVISION_LABEL // Value is "Corporate"
                      : editingUser?.user_access?.Division || "" // Actual division or empty
                  }
                  onChange={(_, newValue) =>
                    handleEditChange("Division", newValue)
                  }
                  getOptionLabel={(option) => option} // Display option name directly
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Division"
                      size="small"
                      placeholder={
                        editingUser?.role === EXECUTIVE_ROLE
                          ? CORPORATE_DIVISION_LABEL // Placeholder reflects the default value
                          : ""
                      }
                    />
                  )}
                  disabled={
                    // Disable if Executive role OR
                    // if it's Finance/Distributor role and no base divisions exist
                    editingUser?.role === EXECUTIVE_ROLE ||
                    (!availableDivisions.length &&
                      (editingUser?.role === FINANCE_ROLE ||
                        editingUser?.role === MARKET_MANAGER_ROLE))
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
                        // Updated helper text logic
                        editingUser?.role === MARKET_MANAGER_ROLE &&
                        !editingUser?.user_access?.Division
                          ? "Select a Division to enable market selection"
                          : editingUser?.role === FINANCE_ROLE &&
                            (!editingUser?.user_access?.Division ||
                              editingUser?.user_access?.Division ===
                                CORPORATE_DIVISION_LABEL)
                          ? 'Select a specific Division (not "Corporate") to enable market selection'
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

                    if (role === EXECUTIVE_ROLE) {
                      chipLabel = WGS_ALL_LABEL;
                      showSummaryChip = true;
                    } else if (role === FINANCE_ROLE) {
                      if (division === CORPORATE_DIVISION_LABEL) {
                        chipLabel = WGS_ALL_LABEL;
                        showSummaryChip = true;
                      } else if (division) {
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
                    } else if (role === MARKET_MANAGER_ROLE && division) {
                      const marketsForDivision =
                        getMarketOptionsForDivision(division);
                      // Show summary chip only if ALL markets for the division are selected
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
                    // Disable market selection for Executive,
                    // for Finance if Corporate or no division is selected,
                    // and for Distributor Manager if no division is selected.
                    !marketsByDivision ||
                    editingUser?.role === EXECUTIVE_ROLE ||
                    (editingUser?.role === FINANCE_ROLE &&
                      (!editingUser?.user_access?.Division ||
                        editingUser?.user_access?.Division ===
                          CORPORATE_DIVISION_LABEL)) ||
                    (editingUser?.role === MARKET_MANAGER_ROLE &&
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
});

export default UserMaster;
