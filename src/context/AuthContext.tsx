"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/client";

export type UserRole = "client" | "provider";

export type UserSession = {
  id: string;
  email: string;
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
    let active = true;
    const supabase = createClient();
    let storedUser: UserSession | null = null;
    try {
      const stored = localStorage.getItem("evigo_user");
      if (stored) {
        storedUser = JSON.parse(stored) as UserSession;
      }
    } catch (e) {
      console.error("Failed to parse user session", e);
      localStorage.removeItem("evigo_user");
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      const sessionUser = data.session?.user;
      if (error || !sessionUser || !storedUser || storedUser.id !== sessionUser.id) {
        localStorage.removeItem("evigo_user");
        setUser(null);
      } else {
        setUser({
          ...storedUser,
          id: sessionUser.id,
          email: sessionUser.email || storedUser.email,
        });
      }
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      console.error("Failed to restore Supabase session", error);
      localStorage.removeItem("evigo_user");
      setUser(null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback((u: UserSession) => {
    localStorage.setItem("evigo_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    void createClient().auth.signOut();
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
