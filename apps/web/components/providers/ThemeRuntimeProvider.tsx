"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as SCThemeProvider } from "styled-components";
import { themes, type ThemeMode } from "@/lib/theme";
import { GlobalStyle } from "./GlobalStyle";

type Pref = "light" | "dark" | "system";
const STORAGE_KEY = "kipita-theme";

type ThemeModeCtx = {
  mode: ThemeMode; // resolved (light | dark)
  pref: Pref; // what the user chose
  setPref: (p: Pref) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeModeCtx | null>(null);

/** Read/control the active colour scheme (light/dark/system). */
export function useThemeMode(): ThemeModeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeRuntimeProvider");
  return ctx;
}

/**
 * Resolves the active theme from an explicit user preference (persisted) or the
 * OS scheme, and lets any component flip it via {@link useThemeMode}.
 */
export function ThemeRuntimeProvider({ children }: { children: React.ReactNode }) {
  // Kipita defaults to dark; a stored choice (or the toggle) overrides it.
  const [pref, setPrefState] = useState<Pref>("dark");
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Pref | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setPrefState(stored);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const mode: ThemeMode = pref === "system" ? (systemDark ? "dark" : "light") : pref;

  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setPref = (p: Pref) => {
    setPrefState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // storage unavailable — session-only preference
    }
  };
  const toggle = () => setPref(mode === "dark" ? "light" : "dark");

  return (
    <SCThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      <Ctx.Provider value={{ mode, pref, setPref, toggle }}>{children}</Ctx.Provider>
    </SCThemeProvider>
  );
}
