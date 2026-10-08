"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getUser } from "@/services/web/auth";

interface AuthContextType {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("asistime_token");
    if (!savedToken) {
      setHydrated(true);
      return;
    }

    setToken(savedToken);
    const isTauri = Boolean((window as any).__TAURI_INTERNALS__);
    const profileRequest = isTauri
      ? invoke("get_user", { authToken: savedToken })
      : getUser(savedToken);

    profileRequest
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem("asistime_token");
        setToken(null);
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && token) window.localStorage.setItem("asistime_token", token);
  }, [hydrated, token]);

  const updateToken: React.Dispatch<React.SetStateAction<string | null>> = (value) => {
    setToken((current) => {
      const next = typeof value === "function" ? value(current) : value;
      if (next) window.localStorage.setItem("asistime_token", next);
      else {
        window.localStorage.removeItem("asistime_token");
        setUser(null);
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ token, setToken: updateToken, user, setUser, hydrated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};