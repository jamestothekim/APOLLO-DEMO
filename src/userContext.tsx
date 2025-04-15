import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// --- Redux Imports for Initial Fetch --- START
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "./redux/store";
import {
  fetchVolumeData,
  selectVolumeDataStatus,
} from "./redux/depletionSlice";
// --- Redux Imports for Initial Fetch --- END

// Types
export interface MarketAccess {
  id: number;
  market: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  customers: {
    customer_id: string;
    customer_coding: string;
    planning_member_id: string;
    customer_stat_level: string;
    customer_actual_data: string;
    customer_stat_level_id: string;
    planning_member_coding: string;
    customer_stat_level_coding: string;
  }[];
  settings: {
    managed_by: string;
  };
}

// Add interface for guidance settings
export interface GuidancePreference {
  id: number;
  order: number;
}

interface GuidanceSettingsPayload {
  summary_cols?: number[];
  summary_rows?: number[];
  forecast_cols?: number[];
  forecast_rows?: number[];
}

interface UserSettings {
  guidance?: GuidancePreference[];
  guidance_settings?: GuidanceSettingsPayload;
  [key: string]: any;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state_code: string;
  zip: string;
  role: string;
  user_access: {
    Markets?: MarketAccess[];
    Division?: string;
    [key: string]: any;
  };
  user_settings: UserSettings;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "SET_CHECKING"; payload: boolean }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "UPDATE_USER_SETTINGS"; payload: UserSettings };

// Token service
const tokenService = {
  getToken() {
    const token = localStorage.getItem("token");

    return token;
  },
  setToken(token: string) {
    localStorage.setItem("token", token);
    // Verify token was set correctly
    const verifyToken = localStorage.getItem("token");
    if (verifyToken) {
      this.setAuthHeader(verifyToken);
    }
  },
  removeToken() {
    localStorage.removeItem("token");
    this.removeAuthHeader();
  },
  setAuthHeader(token: string) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  },
  removeAuthHeader() {
    delete axios.defaults.headers.common["Authorization"];
  },
  verifyTokenPresence() {
    const token = localStorage.getItem("token");
    const hasAuthHeader = !!axios.defaults.headers.common["Authorization"];
    return token && hasAuthHeader;
  },
  syncToken() {
    const token = localStorage.getItem("token");
    const authHeader = axios.defaults.headers.common["Authorization"];
    const headerToken =
      typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : null;

    if (token && !headerToken) {
      this.setAuthHeader(token);
    } else if (!token && headerToken) {
      localStorage.setItem("token", headerToken);
    }
  },
};

// Context
interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateUserSettings: (settings: UserSettings) => Promise<boolean>;
  saveGuidancePreferences: (guidanceIds: number[]) => Promise<boolean>;
  syncGuidanceSettings: (payload: {
    guidance_settings: GuidanceSettingsPayload;
  }) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Reducer
const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isCheckingAuth: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "LOGIN":
      tokenService.setToken(action.payload.token);
      tokenService.setAuthHeader(action.payload.token);
      return {
        user: action.payload.user,
        isLoggedIn: true,
        isCheckingAuth: false,
      };
    case "LOGOUT":
      tokenService.removeToken();
      tokenService.removeAuthHeader();
      return {
        user: null,
        isLoggedIn: false,
        isCheckingAuth: false,
      };
    case "SET_CHECKING":
      return {
        ...state,
        isCheckingAuth: action.payload,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    case "UPDATE_USER_SETTINGS":
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          user_settings: {
            ...state.user.user_settings,
            ...action.payload,
          },
        },
      };
    default:
      return state;
  }
};

// Provider
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();
  // --- Redux Hooks for Initial Fetch --- START
  const appDispatch = useDispatch<AppDispatch>();
  const volumeStatus = useSelector((state: RootState) =>
    selectVolumeDataStatus(state)
  );
  // --- Redux Hooks for Initial Fetch --- END

  // --- Ref to track initial data fetch --- START
  const initialFetchPerformedRef = useRef(false);
  // --- Ref to track initial data fetch --- END

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = tokenService.getToken();

      if (!token) {
        dispatch({ type: "LOGOUT" });
        return false;
      }

      // Verify token is properly set in axios headers
      if (!axios.defaults.headers.common["Authorization"]) {
        tokenService.setAuthHeader(token);
      }

      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users/verify-token?_=${Date.now()}`
      );

      if (response.data.user) {
        // Make sure to update the entire user object with fresh data
        dispatch({ type: "UPDATE_USER", payload: response.data.user });
        return true;
      }
      dispatch({ type: "LOGOUT" });
      return false;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Keep error handling logic but remove logging
      }
      dispatch({ type: "LOGOUT" });
      return false;
    } finally {
      dispatch({ type: "SET_CHECKING", payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/users/login`,
        { email, password }
      );

      if (response.data.user && response.data.token) {
        dispatch({
          type: "LOGIN",
          payload: {
            user: response.data.user,
            token: response.data.token,
          },
        });
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/users/logout`);
    } catch (error) {
      // Still logout even if the server call fails
    } finally {
      dispatch({ type: "LOGOUT" });
      initialFetchPerformedRef.current = false;
      navigate("/login");
    }
  };

  // Initial auth check and periodic checks
  useEffect(() => {
    checkAuth();

    let removalAttempts = 0;
    let lastKnownToken = localStorage.getItem("token");

    // Add storage event listener to detect localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        const currentToken = e.newValue;

        if (!currentToken && e.oldValue) {
          // Token removal detected
          removalAttempts++;

          if (removalAttempts > 3) {
            // Store token in a session variable as backup
            if (lastKnownToken) {
              sessionStorage.setItem("token_backup", lastKnownToken);
            }
            setTimeout(() => {
              // Try to recover from session storage first
              const backupToken = sessionStorage.getItem("token_backup");
              if (backupToken) {
                localStorage.setItem("token", backupToken);
              } else {
                tokenService.syncToken();
              }
              removalAttempts = 0;
            }, 1000);
            return;
          }

          tokenService.syncToken();
        } else if (currentToken) {
          // Token set detected
          lastKnownToken = currentToken;
          removalAttempts = 0;
          // Clear backup if it exists
          sessionStorage.removeItem("token_backup");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Add a more frequent check specifically for token presence
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      const authHeader = axios.defaults.headers.common["Authorization"];
      const backupToken = sessionStorage.getItem("token_backup");

      // If token is missing but we have a backup or header, try to recover
      if (!token && (authHeader || backupToken)) {
        if (backupToken) {
          localStorage.setItem("token", backupToken);
        } else {
          tokenService.syncToken();
        }
      }
    }, 60000); // Check every minute

    const authCheckInterval = setInterval(() => {
      tokenService.syncToken(); // Sync before checking

      if (!tokenService.verifyTokenPresence()) {
        const token = tokenService.getToken();
        if (token) {
          tokenService.setAuthHeader(token);
        } else {
          dispatch({ type: "LOGOUT" });
        }
      }
      checkAuth();
    }, 2 * 60 * 60 * 1000); // 2 hours

    return () => {
      clearInterval(authCheckInterval);
      clearInterval(tokenCheckInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Add mutation observer to detect localStorage changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      tokenService.syncToken();
    });

    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // --- Combined Effect for Market Details and Initial Volume Data Fetch --- START
  useEffect(() => {
    console.log(
      "[UserProvider] Combined effect hook triggered. Current states:",
      {
        isLoggedIn: state.isLoggedIn,
        hasUser: !!state.user,
        userObject: state.user,
        volumeStatus: volumeStatus,
        initialFetchFlag: initialFetchPerformedRef.current,
      }
    );

    // Only run if:
    // 1. Logged in
    // 2. User data is available
    // 3. Initial fetch hasn't been performed yet for this session
    if (state.isLoggedIn && state.user && !initialFetchPerformedRef.current) {
      // Set the flag *before* starting the async operation
      initialFetchPerformedRef.current = true;
      console.log("[UserProvider] Initial fetch flag set to true.");

      const fetchMarketDetailsAndVolumeData = async () => {
        let actualMarketIds: string[] = []; // Default to empty array

        // 1. Fetch Actual Market IDs if user has access defined
        if (state.user?.user_access?.Markets?.length) {
          const userMarketNumericIds = state.user.user_access.Markets.map(
            (m) => m.id
          );

          if (userMarketNumericIds.length > 0) {
            try {
              const response = await axios.get<
                { id: number; market: string; market_id: string }[]
              >(
                `${
                  import.meta.env.VITE_API_URL
                }/volume/get-markets?ids=${userMarketNumericIds.join(",")}`,
                {
                  headers: {
                    Authorization: `Bearer ${tokenService.getToken()}`,
                  },
                }
              );

              if (response.data && response.data.length > 0) {
                actualMarketIds = response.data.map((m) => m.market_id);
                console.log(
                  "[UserProvider] Fetched actual market IDs for user:",
                  actualMarketIds
                );
              } else {
                console.log(
                  "[UserProvider] /get-markets returned no data for the user's numeric IDs. Proceeding with empty market list."
                );
                // actualMarketIds remains []
              }
            } catch (error) {
              console.error(
                "[UserProvider] Error fetching market details from /get-markets. Proceeding with empty market list:",
                error
              );
              // actualMarketIds remains []
            }
          } else {
            console.log(
              "[UserProvider] User has market access array but no numeric IDs. Proceeding with empty market list."
            );
            // actualMarketIds remains []
          }
        } else {
          console.log(
            "[UserProvider] User has no market access defined. Proceeding with empty market list."
          );
          // actualMarketIds remains []
        }

        // 2. Dispatch fetchVolumeData with the determined market IDs (could be populated or empty)
        // Keep isCustomerView as false for the initial default load.
        console.log(
          `[UserProvider] Dispatching fetchVolumeData with market IDs: ${JSON.stringify(
            actualMarketIds
          )}`
        );
        appDispatch(
          fetchVolumeData({
            markets: actualMarketIds,
            brands: null,
            isCustomerView: false,
          })
        ).then((action) => {
          if (fetchVolumeData.fulfilled.match(action)) {
            // Log removed
          } else if (fetchVolumeData.rejected.match(action)) {
            console.error(
              "[UserProvider] fetchVolumeData rejected:",
              action.payload
            );
          }
        });
      };

      // Execute the combined fetch logic
      fetchMarketDetailsAndVolumeData();
    }
  }, [state.isLoggedIn, state.user, volumeStatus, appDispatch]);
  // --- Combined Effect for Market Details and Initial Volume Data Fetch --- END

  // Axios interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (!tokenService.verifyTokenPresence()) {
            dispatch({ type: "LOGOUT" });
            navigate("/login");
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  // Implement the updateUserSettings method
  const updateUserSettings = useCallback(
    async (settings: UserSettings): Promise<boolean> => {
      try {
        if (!state.user) {
          return false;
        }

        const response = await axios.put(
          `${import.meta.env.VITE_API_URL}/users/settings/update`,
          {
            userId: state.user.id,
            settings,
          },
          {
            headers: {
              Authorization: `Bearer ${tokenService.getToken()}`,
            },
          }
        );

        if (response.data.success) {
          dispatch({
            type: "UPDATE_USER_SETTINGS",
            payload: response.data.settings || settings,
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating user settings:", error);
        return false;
      }
    },
    [state.user]
  );

  // Implement the saveGuidancePreferences method
  const saveGuidancePreferences = useCallback(
    async (guidanceIds: number[]): Promise<boolean> => {
      try {
        if (!state.user) {
          return false;
        }

        // Create guidance preferences array with order
        const guidance = guidanceIds.map((id, index) => ({
          id,
          order: index,
        }));

        // Update user settings with new guidance preferences
        const settings: UserSettings = {
          guidance,
        };

        return await updateUserSettings(settings);
      } catch (error) {
        console.error("Error saving guidance preferences:", error);
        return false;
      }
    },
    [state.user, updateUserSettings]
  );

  // --- NEW syncGuidanceSettings Function --- START
  const syncGuidanceSettings = useCallback(
    async (payload: {
      guidance_settings: GuidanceSettingsPayload;
    }): Promise<void> => {
      if (!state.user) {
        console.warn("Cannot sync guidance settings, user not logged in.");
        return; // Or throw error
      }
      try {
        // Use the PATCH endpoint designed for guidance settings
        const response = await axios.patch(
          `${import.meta.env.VITE_API_URL}/users/sync-settings`,
          payload,
          { headers: { Authorization: `Bearer ${tokenService.getToken()}` } }
        );

        // Update context state with the settings confirmed by the backend response
        if (response.data.settings) {
          // Ensure the payload for dispatch matches what the reducer expects
          // If reducer merges top-level, dispatch top-level. If it expects guidance_settings nested, dispatch that.
          // Assuming reducer merges top-level based on UPDATE_USER_SETTINGS structure:
          dispatch({
            type: "UPDATE_USER_SETTINGS",
            payload: response.data.settings,
          });
        } else {
          console.warn(
            "Sync response did not contain settings to update context."
          );
        }
      } catch (error) {
        console.error("Failed to sync guidance settings:", error);
        throw error; // Re-throw so the caller (logout handler) knows it failed
      }
    },
    [state.user]
  ); // Added dependency
  // --- NEW syncGuidanceSettings Function --- END

  const value = {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    isCheckingAuth: state.isCheckingAuth,
    login,
    logout,
    checkAuth,
    updateUserSettings,
    saveGuidancePreferences,
    syncGuidanceSettings,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Hook
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
