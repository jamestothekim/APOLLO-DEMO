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
  market_id?: string;
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
const OPERATIONS_ROLE = "Operations";
const MARKET_MANAGER_ROLE = "Market Manager";
const CORPORATE_DIVISION_LABEL = "Corporate";
const WGS_ALL_LABEL = "WGS - All";

// Centralized role configuration
interface RoleConfig {
  allowedDivisions:
    | "corporate-only"
    | "corporate-plus-others"
    | "non-corporate-only";
  defaultDivision: string | null;
  marketAccess: "all" | "division-based" | "none";
  isDivisionEditable: boolean;
  isMarketEditable: boolean;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  [EXECUTIVE_ROLE]: {
    allowedDivisions: "corporate-only",
    defaultDivision: CORPORATE_DIVISION_LABEL,
    marketAccess: "all",
    isDivisionEditable: false,
    isMarketEditable: false,
  },
  [OPERATIONS_ROLE]: {
    allowedDivisions: "corporate-only",
    defaultDivision: CORPORATE_DIVISION_LABEL,
    marketAccess: "all",
    isDivisionEditable: false,
    isMarketEditable: false,
  },
  [FINANCE_ROLE]: {
    allowedDivisions: "corporate-plus-others",
    defaultDivision: CORPORATE_DIVISION_LABEL,
    marketAccess: "division-based",
    isDivisionEditable: true,
    isMarketEditable: true,
  },
  [MARKET_MANAGER_ROLE]: {
    allowedDivisions: "non-corporate-only",
    defaultDivision: null,
    marketAccess: "division-based",
    isDivisionEditable: true,
    isMarketEditable: true,
  },
};

// Helper functions for role-based logic
const getRoleConfig = (role: string): RoleConfig | null => {
  return ROLE_CONFIGS[role] || null;
};

const getAvailableDivisionsForRole = (
  role: string,
  allDivisions: string[]
): string[] => {
  const config = getRoleConfig(role);
  if (!config) return allDivisions;

  switch (config.allowedDivisions) {
    case "corporate-only":
      return [CORPORATE_DIVISION_LABEL];
    case "corporate-plus-others": {
      const divisions = [...allDivisions];
      if (!divisions.includes(CORPORATE_DIVISION_LABEL)) {
        divisions.unshift(CORPORATE_DIVISION_LABEL);
      }
      return divisions;
    }
    case "non-corporate-only":
      return allDivisions.filter((d) => d !== CORPORATE_DIVISION_LABEL);
    default:
      return allDivisions;
  }
};

const getAvailableMarketsForRole = (
  role: string,
  division: string | undefined,
  allMarkets: MarketOption[],
  marketsByDivision: MarketsByDivision | null,
  getMarketOptionsForDivision: (division: string) => MarketOption[]
): MarketOption[] => {
  const config = getRoleConfig(role);
  if (!config || !allMarkets.length) return [];

  switch (config.marketAccess) {
    case "all":
      return allMarkets;
    case "division-based": {
      if (role === FINANCE_ROLE) {
        if (
          division &&
          division !== CORPORATE_DIVISION_LABEL &&
          marketsByDivision
        ) {
          return getMarketOptionsForDivision(division);
        } else if (division === CORPORATE_DIVISION_LABEL) {
          return allMarkets;
        }
      } else if (
        role === MARKET_MANAGER_ROLE &&
        division &&
        marketsByDivision
      ) {
        return getMarketOptionsForDivision(division);
      }
      return [];
    }
    case "none":
    default:
      return [];
  }
};

// Centralized function to normalize user access data based on role
const normalizeUserAccess = (
  role: string,
  currentDivision: string,
  currentMarkets: MarketOption[],
  allMarkets: MarketOption[],
  marketsByDivision: MarketsByDivision | null,
  getMarketOptionsForDivision: (division: string) => MarketOption[]
): { division: string; markets: MarketOption[] } => {
  const config = getRoleConfig(role);
  if (!config) return { division: currentDivision, markets: currentMarkets };

  let normalizedDivision = currentDivision;
  let normalizedMarkets = currentMarkets;

  // Set default division if role requires it
  if (config.defaultDivision && !normalizedDivision) {
    normalizedDivision = config.defaultDivision;
  }

  // Handle market access based on role configuration
  switch (config.marketAccess) {
    case "all":
      normalizedMarkets = allMarkets;
      if (config.defaultDivision) {
        normalizedDivision = config.defaultDivision;
      }
      break;
    case "division-based":
      if (role === FINANCE_ROLE || role === OPERATIONS_ROLE) {
        if (normalizedDivision === CORPORATE_DIVISION_LABEL) {
          normalizedMarkets = allMarkets;
        } else if (normalizedDivision && marketsByDivision) {
          // For Finance with specific division, preserve existing valid markets
          // Only reset to all division markets if no markets are currently selected
          const divisionMarkets =
            getMarketOptionsForDivision(normalizedDivision);
          const validMarketCodes = new Set(
            divisionMarkets.map((m) => m.market_code)
          );

          // Filter current markets to only include valid ones for this division
          const validCurrentMarkets = normalizedMarkets.filter((market) =>
            validMarketCodes.has(market.market_code)
          );

          // If no valid markets remain, default to all division markets
          // Otherwise, keep the user's existing valid selections
          normalizedMarkets =
            validCurrentMarkets.length > 0
              ? validCurrentMarkets
              : divisionMarkets;
        } else {
          // Default to Corporate for Finance/Operations if no valid division
          normalizedDivision = CORPORATE_DIVISION_LABEL;
          normalizedMarkets = allMarkets;
        }
      } else if (role === MARKET_MANAGER_ROLE) {
        if (normalizedDivision && marketsByDivision) {
          const divisionMarkets =
            getMarketOptionsForDivision(normalizedDivision);
          const validMarketCodes = new Set(
            divisionMarkets.map((m) => m.market_code)
          );

          // Filter current markets to only include valid ones for this division
          const validCurrentMarkets = normalizedMarkets.filter((market) =>
            validMarketCodes.has(market.market_code)
          );

          // If no valid markets remain or this is a new division selection,
          // default to all division markets
          normalizedMarkets =
            validCurrentMarkets.length > 0
              ? validCurrentMarkets
              : divisionMarkets;
        } else {
          normalizedDivision = "";
          normalizedMarkets = [];
        }
      }
      break;
    case "none":
    default:
      // Keep current values
      break;
  }

  return { division: normalizedDivision, markets: normalizedMarkets };
};

// Helper functions for UI state
const isFieldDisabled = (
  role: string,
  field: "division" | "markets"
): boolean => {
  const config = getRoleConfig(role);
  if (!config) return false;

  if (field === "division") {
    return !config.isDivisionEditable;
  } else if (field === "markets") {
    return !config.isMarketEditable;
  }
  return false;
};

const getMarketDisplayInfo = (
  role: string,
  division: string | undefined,
  selectedMarkets: MarketOption[],
  marketsByDivision: MarketsByDivision | null,
  getMarketOptionsForDivision: (division: string) => MarketOption[]
): { displayLabel: string; showIndividualChips: boolean } => {
  const numSelected = selectedMarkets.length;
  let displayLabel = "-";
  let showIndividualChips = false;

  const config = getRoleConfig(role);
  if (!config) return { displayLabel, showIndividualChips };

  if (config.marketAccess === "all") {
    displayLabel = WGS_ALL_LABEL;
  } else if (config.marketAccess === "division-based" && division) {
    if (role === FINANCE_ROLE || role === OPERATIONS_ROLE) {
      if (division === CORPORATE_DIVISION_LABEL) {
        displayLabel = WGS_ALL_LABEL;
      } else if (marketsByDivision) {
        const marketsForDivision = getMarketOptionsForDivision(division);
        if (
          numSelected === marketsForDivision.length &&
          marketsForDivision.length > 0
        ) {
          displayLabel = `${division} - All`;
        } else if (numSelected > 0) {
          showIndividualChips = true;
          displayLabel = "";
        }
      }
    } else if (role === MARKET_MANAGER_ROLE && marketsByDivision) {
      const marketsForDivision = getMarketOptionsForDivision(division);
      if (
        numSelected === marketsForDivision.length &&
        marketsForDivision.length > 0
      ) {
        displayLabel = `${division} - All`;
      } else if (numSelected > 0) {
        showIndividualChips = true;
        displayLabel = "";
      }
    }
  }

  return { displayLabel, showIndividualChips };
};

const getMarketTagDisplay = (
  role: string,
  division: string | undefined,
  selectedMarkets: MarketOption[],
  getMarketOptionsForDivision: (division: string) => MarketOption[]
): { chipLabel: string; showSummaryChip: boolean } => {
  const numSelected = selectedMarkets.length;
  let chipLabel = "";
  let showSummaryChip = false;

  const config = getRoleConfig(role);
  if (!config) return { chipLabel, showSummaryChip };

  if (config.marketAccess === "all") {
    chipLabel = WGS_ALL_LABEL;
    showSummaryChip = true;
  } else if (config.marketAccess === "division-based" && division) {
    if (role === FINANCE_ROLE || role === OPERATIONS_ROLE) {
      if (division === CORPORATE_DIVISION_LABEL) {
        chipLabel = WGS_ALL_LABEL;
        showSummaryChip = true;
      } else {
        const marketsForDivision = getMarketOptionsForDivision(division);
        if (
          numSelected === marketsForDivision.length &&
          marketsForDivision.length > 0
        ) {
          chipLabel = `${division} - All`;
          showSummaryChip = true;
        }
      }
    } else if (role === MARKET_MANAGER_ROLE) {
      const marketsForDivision = getMarketOptionsForDivision(division);
      if (
        numSelected === marketsForDivision.length &&
        marketsForDivision.length > 0
      ) {
        chipLabel = `${division} - All`;
        showSummaryChip = true;
      }
    }
  }

  return { chipLabel, showSummaryChip };
};

const getDivisionDisplayValue = (
  role: string,
  division: string | undefined
): string => {
  const config = getRoleConfig(role);
  if (!config) return division || "-";

  // For roles with "all" market access, always show Corporate
  if (config.marketAccess === "all") {
    return CORPORATE_DIVISION_LABEL;
  }

  // For Finance/Operations with Corporate division, show Corporate
  if (
    (role === FINANCE_ROLE || role === OPERATIONS_ROLE) &&
    division === CORPORATE_DIVISION_LABEL
  ) {
    return CORPORATE_DIVISION_LABEL;
  }

  return division || "-";
};

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
  // Roles will be loaded from backend; start empty to avoid showing incorrect list before fetch
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Get available divisions based on role configuration
  const divisionsForAutocomplete = useMemo(() => {
    if (!editingUser?.role) return availableDivisions;
    return getAvailableDivisionsForRole(editingUser.role, availableDivisions);
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
        market_id: market.market_id,
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
      // Derive available divisions from the fetched data if not already set via access roles
      if (response.data && !availableDivisions.length) {
        setAvailableDivisions(Object.keys(response.data));
      }
    } catch (error) {
      console.error("Error fetching markets by division:", error);
      showSnackbar("Failed to fetch division market data", "error");
    }
  };

  const fetchAccessRoles = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-access-roles`
      );
      const { roles, divisions } = response.data || {};

      if (roles && Array.isArray(roles)) {
        setAvailableRoles(roles);
      }

      if (divisions && Array.isArray(divisions)) {
        setAvailableDivisions(divisions);
      }
    } catch (error) {
      console.error("Error fetching access roles:", error);
      showSnackbar("Failed to fetch access roles", "error");
    }
  };

  const handleEdit = (user: User) => {
    // Normalize user access data based on role configuration
    const { division: normalizedDivision, markets: normalizedMarkets } =
      normalizeUserAccess(
        user.role,
        user.user_access?.Division ?? "",
        user.user_access?.Markets ?? [],
        allMarkets,
        marketsByDivision,
        getMarketOptionsForDivision
      );

    const userToEdit = {
      ...user,
      user_access: {
        Division: normalizedDivision,
        Markets: normalizedMarkets,
        Admin: user.user_access?.Admin ?? false,
        Status: user.user_access?.Status,
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
      updatedUser = {
        ...updatedUser,
        user_access: {
          ...updatedUser.user_access,
          Markets: value as MarketOption[],
        },
      };
    } else if (field === "Division") {
      const newDivision = value as string | null;

      // For Market Manager changing division, reset markets to empty
      // so they get all markets for the new division
      let currentMarkets = updatedUser.user_access?.Markets || [];
      if (
        updatedUser.role === MARKET_MANAGER_ROLE &&
        newDivision &&
        marketsByDivision
      ) {
        currentMarkets = [];
      }

      const { markets: updatedMarkets } = normalizeUserAccess(
        updatedUser.role,
        newDivision ?? "",
        currentMarkets,
        allMarkets,
        marketsByDivision,
        getMarketOptionsForDivision
      );

      updatedUser = {
        ...updatedUser,
        user_access: {
          ...updatedUser.user_access,
          Division: newDivision ?? "",
          Markets: updatedMarkets,
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

      // Handle division changes when switching roles
      let currentDivision = updatedUser.user_access?.Division || "";
      let currentMarkets = updatedUser.user_access?.Markets || [];

      // If switching to Market Manager from a role that was Corporate,
      // set division to first available non-corporate option
      if (
        newRole === MARKET_MANAGER_ROLE &&
        currentDivision === CORPORATE_DIVISION_LABEL
      ) {
        const availableForMarketManager = getAvailableDivisionsForRole(
          newRole,
          availableDivisions
        );
        currentDivision =
          availableForMarketManager.length > 0
            ? availableForMarketManager[0]
            : "";
        // Reset markets since division is changing
        currentMarkets = [];
      }
      // For Market Manager role switching, if they already have a valid division,
      // we want to ensure they get all markets for that division
      else if (
        newRole === MARKET_MANAGER_ROLE &&
        currentDivision &&
        marketsByDivision
      ) {
        // Reset markets to empty so normalizeUserAccess will default to all division markets
        currentMarkets = [];
      }

      const { division: updatedDivision, markets: updatedMarkets } =
        normalizeUserAccess(
          newRole,
          currentDivision,
          currentMarkets,
          allMarkets,
          marketsByDivision,
          getMarketOptionsForDivision
        );

      updatedUser = {
        ...updatedUser,
        role: newRole,
        user_access: {
          ...updatedUser.user_access,
          Division: updatedDivision,
          Markets: updatedMarkets,
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

  // Extract an array of market_ids for the given division, supporting
  // both legacy (string array) and new (array of objects) formats
  const getMarketIdsForDivision = (division: string): string[] => {
    if (!marketsByDivision || !division || !marketsByDivision[division]) {
      return [];
    }

    const ids: string[] = [];
    const teams = marketsByDivision[division];
    Object.values(teams).forEach((marketsInTeam: any) => {
      if (!Array.isArray(marketsInTeam)) return;

      marketsInTeam.forEach((item: any) => {
        if (typeof item === "string") {
          // legacy string of market_id or market_name (fallback)
          ids.push(item);
        } else if (item && typeof item === "object" && item.market_id) {
          ids.push(item.market_id);
        }
      });
    });
    return ids;
  };

  const getMarketOptionsForDivision = (division: string): MarketOption[] => {
    const ids = getMarketIdsForDivision(division);
    return allMarkets.filter((m) => m.market_id && ids.includes(m.market_id));
  };

  const availableMarketsForSelection = useMemo((): MarketOption[] => {
    if (!editingUser?.role) return [];
    return getAvailableMarketsForRole(
      editingUser.role,
      editingUser.user_access?.Division,
      allMarkets,
      marketsByDivision,
      getMarketOptionsForDivision
    );
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

  // ---- Resend Invite handler ----
  const handleResendInvite = async (userId: number) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/resend-invite/${userId}`
      );
      showSnackbar("Invitation email resent successfully", "success");
      // Close sidebar after successful resend
      setSidebarOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error resending invite:", error);
      let errorMessage = "Failed to resend invite";
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      }
      showSnackbar(errorMessage, "error");
    }
  };

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
      render: (_: any, row: User) =>
        getDivisionDisplayValue(row.role, row.user_access?.Division),
      sortable: true,
      sortAccessor: (row: User) => row.user_access?.Division,
      sx: { width: 190 },
    },
    {
      header: "Markets",
      key: "markets",
      render: (_: any, row: User) => {
        const selectedMarkets = row.user_access?.Markets || [];
        const { displayLabel, showIndividualChips } = getMarketDisplayInfo(
          row.role,
          row.user_access?.Division,
          selectedMarkets,
          marketsByDivision,
          getMarketOptionsForDivision
        );

        const MAX_CHIPS = 4;
        const chipsToRender = showIndividualChips
          ? selectedMarkets.slice(0, MAX_CHIPS)
          : [];
        const remainingCount = showIndividualChips
          ? selectedMarkets.length - chipsToRender.length
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
            {!displayLabel &&
              !showIndividualChips &&
              selectedMarkets.length === 0 && (
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
      align: "center" as const,
      render: (_: any, row: User) => {
        const status =
          row.user_access?.Status === "pending" ? "Pending" : "Active";
        return (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
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
          </Box>
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
          // Show Resend Invite button on the far left if the user is pending
          ...(editingUser?.id !== 0 &&
          editingUser?.user_access?.Status === "pending"
            ? [
                {
                  label: "Resend Invite",
                  onClick: () => handleResendInvite(editingUser.id),
                  variant: "outlined" as const,
                  align: "left" as const,
                },
              ]
            : []),
          // Existing Delete button
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
          // Cancel & Save buttons
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
                  options={divisionsForAutocomplete}
                  value={
                    editingUser?.role === EXECUTIVE_ROLE
                      ? CORPORATE_DIVISION_LABEL
                      : editingUser?.user_access?.Division || ""
                  }
                  onChange={(_, newValue) =>
                    handleEditChange("Division", newValue)
                  }
                  getOptionLabel={(option) => option}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Division"
                      size="small"
                      placeholder={
                        editingUser?.role === EXECUTIVE_ROLE
                          ? CORPORATE_DIVISION_LABEL
                          : ""
                      }
                    />
                  )}
                  disabled={
                    (editingUser?.role &&
                      isFieldDisabled(editingUser.role, "division")) ||
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

                    const { chipLabel, showSummaryChip } = role
                      ? getMarketTagDisplay(
                          role,
                          division,
                          value,
                          getMarketOptionsForDivision
                        )
                      : { chipLabel: "", showSummaryChip: false };

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
                      const overflowLabel = `${firstOption.market} (${
                        firstOption.market_code
                      }) + ${numSelected - 1} more`;
                      return [
                        <Chip
                          key="summary-chip"
                          label={overflowLabel}
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
                    (editingUser?.role &&
                      isFieldDisabled(editingUser.role, "markets")) ||
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

              {/* Account Status Row (only for existing users) */}
              {editingUser?.id !== 0 && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography>Account Status</Typography>
                    {(() => {
                      const statusText =
                        editingUser?.user_access?.Status === "pending"
                          ? "Pending"
                          : "Active";
                      const isActive = statusText === "Active";
                      return (
                        <Chip
                          label={statusText}
                          size="small"
                          color="primary"
                          variant={isActive ? "filled" : "outlined"}
                          sx={{
                            borderRadius: "16px",
                            backgroundColor: isActive
                              ? "primary.main"
                              : "transparent",
                            border: isActive ? "none" : "1px solid",
                            borderColor: "primary.main",
                            color: isActive ? "white" : "primary.main",
                            fontFamily: "theme.typography.fontFamily",
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      );
                    })()}
                  </Box>

                  {/* Pending notice */}
                  {editingUser?.user_access?.Status === "pending" && (
                    <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                      This user is still pending activation
                    </Alert>
                  )}
                </>
              )}

              {/* Admin Access Row */}
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
