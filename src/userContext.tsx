import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "./redux/store";
import { fetchVolumeData } from "./redux/slices/depletionSlice";
import { fetchDashboardConfig } from "./redux/slices/dashboardSlice";
import {
  setSelectedBrands,
  syncAllSettings,
  setSelectedMarkets,
} from "./redux/slices/userSettingsSlice";
import { loadGuidanceSettings } from "./redux/guidance/guidanceSlice";

// Types
type Customer = {
  customer_id: string;
  customer_coding: string;
  planning_member_id: string;
  customer_stat_level: string;
  customer_actual_data: string;
  customer_stat_level_id: string;
  planning_member_coding: string;
  customer_stat_level_coding: string;
};

export interface MarketAccess {
  id: number;
  market: string;
  market_code: string;
  market_hyperion: string;
  market_coding: string;
  market_id: string;
  customers: Customer[];
  settings: {
    managed_by: string;
  };
}

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
  selected_brands?: string[];
  selected_markets?: string[];
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
  phone_number?: string;
  phone_verified?: boolean;
  two_fa_enabled?: boolean;
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
  isInitialDataLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "SET_CHECKING"; payload: boolean }
  | { type: "SET_INITIAL_DATA_LOADING"; payload: boolean }
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
  isInitialDataLoading: boolean;
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
  isInitialDataLoading: false,
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
        isInitialDataLoading: true,
      };
    case "LOGOUT":
      tokenService.removeToken();
      tokenService.removeAuthHeader();
      return {
        user: null,
        isLoggedIn: false,
        isCheckingAuth: false,
        isInitialDataLoading: false,
      };
    case "SET_CHECKING":
      return {
        ...state,
        isCheckingAuth: action.payload,
      };
    case "SET_INITIAL_DATA_LOADING":
      return {
        ...state,
        isInitialDataLoading: action.payload,
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
  const appDispatch = useDispatch<AppDispatch>();

  const initialFetchPerformedRef = useRef(false);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = tokenService.getToken();

      if (!token) {
        dispatch({ type: "LOGOUT" });
        return false;
      }

      if (!axios.defaults.headers.common["Authorization"]) {
        tokenService.setAuthHeader(token);
      }

      // Demo mode - generate demo user data
      const { generateDemoUser } = await import("./playData/dataGenerators");
      const { simulateApiDelay } = await import("./playData/demoConfig");

      await simulateApiDelay(); // Simulate API delay

      const demoUser = generateDemoUser();
      dispatch({ type: "UPDATE_USER", payload: demoUser });
      await appDispatch(loadGuidanceSettings()).unwrap();
      return true;
    } catch (error) {
      console.error("[UserContext] Authentication error:", error);
      dispatch({ type: "LOGOUT" });
      return false;
    } finally {
      dispatch({ type: "SET_CHECKING", payload: false });
    }
  };

  const login = async (_email: string, _password: string): Promise<boolean> => {
    console.log("UserContext login called with:", _email);
    try {
      // Demo login - generate demo user and token
      const { generateDemoUser } = await import("./playData/dataGenerators");
      const { createDemoToken, simulateApiDelay } = await import(
        "./playData/demoConfig"
      );

      console.log("Simulating API delay...");
      await simulateApiDelay(); // Simulate API delay

      console.log("Generating demo user...");
      const demoUser = generateDemoUser();
      const token = createDemoToken(demoUser.id);

      console.log("Dispatching LOGIN action...");
      // First dispatch the LOGIN action to set the token
      dispatch({
        type: "LOGIN",
        payload: {
          user: demoUser,
          token: token,
        },
      });

      console.log("Loading guidance settings...");
      // Load guidance settings without passing token (it will use the one from localStorage)
      await appDispatch(loadGuidanceSettings()).unwrap();
      console.log("Login successful!");
      return true;
    } catch (error) {
      console.error("Login error in userContext:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Sync all settings before logging out
      await appDispatch(syncAllSettings()).unwrap();

      // Demo logout - no API call needed
      const { simulateApiDelay } = await import("./playData/demoConfig");
      await simulateApiDelay(100, 300); // Quick delay for logout
    } catch (error) {
      console.error("Error during logout:", error);
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

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        const currentToken = e.newValue;

        if (!currentToken && e.oldValue) {
          removalAttempts++;

          if (removalAttempts > 3) {
            if (lastKnownToken) {
              sessionStorage.setItem("token_backup", lastKnownToken);
            }
            setTimeout(() => {
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
          lastKnownToken = currentToken;
          removalAttempts = 0;
          sessionStorage.removeItem("token_backup");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      const authHeader = axios.defaults.headers.common["Authorization"];
      const backupToken = sessionStorage.getItem("token_backup");

      if (!token && (authHeader || backupToken)) {
        if (backupToken) {
          localStorage.setItem("token", backupToken);
        } else {
          tokenService.syncToken();
        }
      }
    }, 60000);

    const authCheckInterval = setInterval(() => {
      tokenService.syncToken();

      if (!tokenService.verifyTokenPresence()) {
        const token = tokenService.getToken();
        if (token) {
          tokenService.setAuthHeader(token);
        } else {
          dispatch({ type: "LOGOUT" });
        }
      }
      checkAuth();
    }, 2 * 60 * 60 * 1000);

    return () => {
      clearInterval(authCheckInterval);
      clearInterval(tokenCheckInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [checkAuth]);

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

  useEffect(() => {
    if (state.isLoggedIn && state.user && !initialFetchPerformedRef.current) {
      initialFetchPerformedRef.current = true;

      // Set loading state to true when starting initial data fetch
      dispatch({ type: "SET_INITIAL_DATA_LOADING", payload: true });

      // Initialize guidance settings from user preferences
      if (state.user.user_settings) {
        const {
          guidance_settings,
          summary_selected_brands,
          summary_selected_markets,
        } = state.user.user_settings;
        if (
          guidance_settings ||
          summary_selected_brands ||
          summary_selected_markets
        ) {
          // Initialize selected brands if they exist
          if (summary_selected_brands) {
            appDispatch(setSelectedBrands(summary_selected_brands));
          }

          // Initialize selected markets if they exist
          if (summary_selected_markets) {
            appDispatch(setSelectedMarkets(summary_selected_markets));
          }
        }
      }

      const fetchAllInitialData = async () => {
        try {
          // Fetch dashboard data
          await appDispatch(fetchDashboardConfig()).unwrap();

          const fetchMarketDetailsAndVolumeData = async () => {
            let marketViewMarketIds: string[] = [];
            let customerViewCustomerIds: string[] = [];
            let detailedMarkets: any[] = [];

            // 1. Fetch FULL details for ALL markets user has access to
            if (state.user?.user_access?.Markets?.length) {
              const userMarketIds = state.user.user_access.Markets.map(
                (m) => m.id
              );

              if (userMarketIds.length > 0) {
                try {
                  // Demo mode - generate detailed market data
                  const { generateDetailedMarkets } = await import(
                    "./playData/dataGenerators"
                  );
                  const { simulateApiDelay } = await import(
                    "./playData/demoConfig"
                  );

                  await simulateApiDelay();
                  detailedMarkets = generateDetailedMarkets(userMarketIds);
                } catch (error) {
                  console.error(
                    "[UserProvider] Error generating market details:",
                    error
                  );
                }
              }
            } else {
              return;
            }

            // 2. Now, use detailedMarkets to filter and extract IDs
            if (detailedMarkets.length > 0) {
              const marketManagedMarkets = detailedMarkets.filter(
                (m) => m.settings?.managed_by !== "Customer"
              );
              const customerManagedMarkets = detailedMarkets.filter(
                (m) => m.settings?.managed_by === "Customer"
              );

              // Extract Market IDs for Market View - Include both market and customer managed markets
              marketViewMarketIds = [
                ...marketManagedMarkets,
                ...customerManagedMarkets,
              ]
                .map((m) => m.market_id)
                .filter(Boolean);

              // Extract Customer IDs for Customer View
              if (customerManagedMarkets.length > 0) {
                const rawCustomerIds = customerManagedMarkets
                  .flatMap(
                    (market) =>
                      market.customers?.map(
                        (cust: Customer) => cust.customer_id
                      ) || []
                  )
                  .filter((id): id is string => !!id);

                customerViewCustomerIds = [...new Set(rawCustomerIds)];
              }
            }

            // Create promises for volume data fetching
            const fetchPromises = [];

            // 3. Dispatch fetchVolumeData for Market View (if applicable)
            if (marketViewMarketIds.length > 0) {
              const marketViewPromise = appDispatch(
                fetchVolumeData({
                  markets: marketViewMarketIds,
                  brands: null,
                  isCustomerView: false,
                })
              ).unwrap();
              fetchPromises.push(marketViewPromise);
            }

            // 4. Dispatch fetchVolumeData for Customer View (if applicable)
            if (customerViewCustomerIds.length > 0) {
              const customerViewPromise = appDispatch(
                fetchVolumeData({
                  markets: customerViewCustomerIds,
                  brands: null,
                  isCustomerView: true,
                })
              ).unwrap();
              fetchPromises.push(customerViewPromise);
            }

            // Wait for all volume data to load
            if (fetchPromises.length > 0) {
              await Promise.all(fetchPromises);
            }
          };

          await fetchMarketDetailsAndVolumeData();
        } catch (error) {
          console.error(
            "[UserContext] Error during initial data fetch:",
            error
          );
        } finally {
          // Set loading to false when all data is loaded (or failed)
          dispatch({ type: "SET_INITIAL_DATA_LOADING", payload: false });
        }
      };

      fetchAllInitialData();
    }
  }, [state.isLoggedIn, state.user, appDispatch]);

  const value = {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    isCheckingAuth: state.isCheckingAuth,
    isInitialDataLoading: state.isInitialDataLoading,
    login,
    logout,
    checkAuth,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
