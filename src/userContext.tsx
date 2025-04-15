import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// REMOVED --- Redux Imports for Initial Fetch --- START
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "./redux/store";
import {
  fetchVolumeData,
  selectVolumeDataStatus,
} from "./redux/depletionSlice";
// REMOVED --- Redux Imports for Initial Fetch --- END

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

// REMOVED Add interface for guidance settings
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
    // REMOVED Verify token was set correctly
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
  // REMOVED --- Redux Hooks for Initial Fetch --- START
  const appDispatch = useDispatch<AppDispatch>();
  const volumeStatus = useSelector((state: RootState) =>
    selectVolumeDataStatus(state)
  );
  // REMOVED --- Redux Hooks for Initial Fetch --- END

  // REMOVED --- Ref to track initial data fetch --- START
  const initialFetchPerformedRef = useRef(false);
  // REMOVED --- Ref to track initial data fetch --- END

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = tokenService.getToken();

      if (!token) {
        dispatch({ type: "LOGOUT" });
        return false;
      }

      // REMOVED Verify token is properly set in axios headers
      if (!axios.defaults.headers.common["Authorization"]) {
        tokenService.setAuthHeader(token);
      }

      // REMOVED Add cache-busting parameter to ensure fresh data
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users/verify-token?_=${Date.now()}`
      );

      if (response.data.user) {
        // REMOVED Make sure to update the entire user object with fresh data
        dispatch({ type: "UPDATE_USER", payload: response.data.user });
        return true;
      }
      dispatch({ type: "LOGOUT" });
      return false;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // REMOVED Keep error handling logic but remove logging
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
      // REMOVED Still logout even if the server call fails
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

    // REMOVED Add storage event listener to detect localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        const currentToken = e.newValue;

        if (!currentToken && e.oldValue) {
          // REMOVED Token removal detected
          removalAttempts++;

          if (removalAttempts > 3) {
            // REMOVED Store token in a session variable as backup
            if (lastKnownToken) {
              sessionStorage.setItem("token_backup", lastKnownToken);
            }
            setTimeout(() => {
              // REMOVED Try to recover from session storage first
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
          // REMOVED Token set detected
          lastKnownToken = currentToken;
          removalAttempts = 0;
          // REMOVED Clear backup if it exists
          sessionStorage.removeItem("token_backup");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // REMOVED Add a more frequent check specifically for token presence
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      const authHeader = axios.defaults.headers.common["Authorization"];
      const backupToken = sessionStorage.getItem("token_backup");

      // REMOVED If token is missing but we have a backup or header, try to recover
      if (!token && (authHeader || backupToken)) {
        if (backupToken) {
          localStorage.setItem("token", backupToken);
        } else {
          tokenService.syncToken();
        }
      }
    }, 60000); // REMOVED Check every minute

    const authCheckInterval = setInterval(() => {
      tokenService.syncToken(); // REMOVED Sync before checking

      if (!tokenService.verifyTokenPresence()) {
        const token = tokenService.getToken();
        if (token) {
          tokenService.setAuthHeader(token);
        } else {
          dispatch({ type: "LOGOUT" });
        }
      }
      checkAuth();
    }, 2 * 60 * 60 * 1000); // REMOVED 2 hours

    return () => {
      clearInterval(authCheckInterval);
      clearInterval(tokenCheckInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // REMOVED Add mutation observer to detect localStorage changes
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

  // REMOVED --- Combined Effect for Market Details and Initial Volume Data Fetch --- START
  useEffect(() => {
    // REMOVED console.log
    // REMOVED "[UserProvider] Combined effect hook triggered. Current states:",
    // REMOVED {
    // REMOVED   isLoggedIn: state.isLoggedIn,
    // REMOVED   hasUser: !!state.user,
    // REMOVED   userObject: state.user,
    // REMOVED   volumeStatus: volumeStatus,
    // REMOVED   initialFetchFlag: initialFetchPerformedRef.current,
    // REMOVED }
    // REMOVED );

    // REMOVED Only run if:
    // REMOVED 1. Logged in
    // REMOVED 2. User data is available
    // REMOVED 3. Initial fetch hasn't been performed yet for this session
    if (state.isLoggedIn && state.user && !initialFetchPerformedRef.current) {
      // REMOVED Set the flag *before* starting the async operation
      initialFetchPerformedRef.current = true;
      // REMOVED console.log("[UserProvider] Initial fetch flag set to true.");

      const fetchMarketDetailsAndVolumeData = async () => {
        let actualMarketIds: string[] = []; // REMOVED Default to empty array

        // REMOVED 1. Fetch Actual Market IDs if user has access defined
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
                // REMOVED console.log(
                // REMOVED   "[UserProvider] Fetched actual market IDs for user:",
                // REMOVED   actualMarketIds
                // REMOVED );
              } else {
                // REMOVED console.log(
                // REMOVED   "[UserProvider] /get-markets returned no data for the user's numeric IDs. Proceeding with empty market list."
                // REMOVED );
                // REMOVED actualMarketIds remains []
              }
            } catch (error) {
              // REMOVED console.error(
              // REMOVED   "[UserProvider] Error fetching market details from /get-markets. Proceeding with empty market list:",
              // REMOVED   error
              // REMOVED );
              // REMOVED actualMarketIds remains []
            }
          } else {
            // REMOVED console.log(
            // REMOVED   "[UserProvider] User has market access array but no numeric IDs. Proceeding with empty market list."
            // REMOVED );
            // REMOVED actualMarketIds remains []
          }
        } else {
          // REMOVED console.log(
          // REMOVED   "[UserProvider] User has no market access defined. Proceeding with empty market list."
          // REMOVED );
          // REMOVED actualMarketIds remains []
        }

        // REMOVED 2. Dispatch fetchVolumeData with the determined market IDs (could be populated or empty)
        // REMOVED Keep isCustomerView as false for the initial default load.
        // REMOVED console.log(
        // REMOVED   `[UserProvider] Dispatching fetchVolumeData with market IDs: ${JSON.stringify(
        // REMOVED     actualMarketIds
        // REMOVED   )}`
        // REMOVED );
        appDispatch(
          fetchVolumeData({
            markets: actualMarketIds,
            brands: null,
            isCustomerView: false,
          })
        ).then((action) => {
          if (fetchVolumeData.fulfilled.match(action)) {
            // REMOVED Log removed
          } else if (fetchVolumeData.rejected.match(action)) {
            // REMOVED console.error(
            // REMOVED   "[UserProvider] fetchVolumeData rejected:",
            // REMOVED   action.payload
            // REMOVED );
          }
        });
      };

      // REMOVED Execute the combined fetch logic
      fetchMarketDetailsAndVolumeData();
    }
  }, [state.isLoggedIn, state.user, volumeStatus, appDispatch]);
  // REMOVED --- Combined Effect for Market Details and Initial Volume Data Fetch --- END

  // REMOVED Axios interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // REMOVED Check if token is still present before logging out
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

  const value = {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    isCheckingAuth: state.isCheckingAuth,
    login,
    logout,
    checkAuth,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// REMOVED Hook
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
