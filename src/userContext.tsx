import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import axios from "axios";

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
  user_settings: {
    [key: string]: any;
  };
}

interface UserContextType {
  user: User | null;
  updateUser: (user: User) => void;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
  isCheckingSession: boolean;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

interface ProtectedRouteProps {
  children: ReactNode;
}

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const checkSession = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/check-session`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLoggedIn(true);
        return true;
      } else {
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem("isAuthenticated");
        return false;
      }
    } catch (error) {
      console.error("Session check error:", error);
      alert("Failed to check session. Please ensure the server is running.");
      // Don't update state on network errors to prevent logout on temporary issues
      return false;
    } finally {
      setIsCheckingSession(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/users/check-session`,
        { withCredentials: true }
      );
      console.log("Refresh user response:", response.data);
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  // Initial session check and periodic checks
  useEffect(() => {
    checkSession();
    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem("isAuthenticated", "true");
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem("isAuthenticated");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    updateUser: setUser,
    isLoggedIn,
    login,
    logout,
    checkSession,
    isCheckingSession,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Protected Route component integrated into the same file
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn, isCheckingSession } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isCheckingSession && !isLoggedIn) {
      navigate("/login", { state: { from: location }, replace: true });
    }
  }, [isCheckingSession, isLoggedIn, navigate, location]);

  if (isCheckingSession) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return isLoggedIn ? <>{children}</> : null;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
