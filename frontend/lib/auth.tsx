"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import mockUsers from "./mockUsers.json";

type User = {
  username: string;
  name: string;
  roles: string[];
  allowedProjects: string[];
};

type AuthContextValue = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  isAuthenticated: boolean;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("mockAuthUser");
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        sessionStorage.removeItem("mockAuthUser");
      }
    }
    setIsReady(true);
  }, []);

  const login = async (username: string, password: string) => {
    const matched = mockUsers.find(
      (item) => item.username === username && item.password === password
    );

    if (!matched) {
      throw new Error("Invalid username or password");
    }

    const nextUser = {
      username: matched.username,
      name: matched.name,
      roles: matched.roles,
      allowedProjects: matched.allowedProjects ?? [],
    };
    setUser(nextUser);
    sessionStorage.setItem("mockAuthUser", JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("mockAuthUser");
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      hasRole: (role: string) => Boolean(user?.roles.includes(role)),
      canAccessProject: (projectId: string) =>
        Boolean(
          user?.allowedProjects.includes("all") ||
            user?.allowedProjects.includes(projectId)
        ),
      isAuthenticated: Boolean(user),
      isReady,
    }),
    [user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
