import React, { createContext, useState, useContext, ReactNode } from "react";

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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Login response data:", data);
        console.log("User access markets:", data.user.user_access.Markets);
        setUser(data.user);
        setIsLoggedIn(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    console.log("User logged out");
  };

  const value = {
    user,
    updateUser: setUser,
    isLoggedIn,
    login,
    logout,
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
