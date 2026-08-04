"use client";

import { useEffect, useState } from "react";
import { ThemeProvider as SCThemeProvider } from "styled-components";
import { themes, type ThemeMode } from "@/lib/theme";
import { GlobalStyle } from "./GlobalStyle";

/**
 * Supplies the active styled-components theme, chosen from the user's OS
 * `prefers-color-scheme`. Server render (and the first client render) use the
 * light theme so hydration matches; on mount we sync to the real scheme and
 * subscribe to live changes. GlobalStyle keeps the page background correct for
 * dark users during that first tick via a CSS media query, so there's no flash
 * of the wrong page chrome.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setMode(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  return (
    <SCThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      {children}
    </SCThemeProvider>
  );
}
