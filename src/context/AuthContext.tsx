"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type UserRole = "client" | "provider";

export type UserSession = {
  id: string;
  phone: string;
  role: UserRole;
  profileImage?: string;
  createdAt?: string;
};

type AuthState = {
  user: UserSession | null;
  role: UserRole | null;
  loading: boolean;
  login: (user: UserSession) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("evigo_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse user session", e);
    }
    setLoading(false);
  }, []);

  const login = useCallback((u: UserSession) => {
    localStorage.setItem("evigo_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("evigo_user");
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      role: user?.role ?? null,
      loading,
      login,
      signOut,
    }),
    [user, loading, login, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
