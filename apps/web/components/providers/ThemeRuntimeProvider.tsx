"use client";

import { useEffect, useState } from "react";
import { ThemeProvider as SCThemeProvider } from "styled-components";
import { themes, type ThemeMode } from "@/lib/theme";
import { GlobalStyle } from "./GlobalStyle";

/**
 * Swaps the default server theme to the user's preferred colour scheme on the
 * client and keeps it in sync with OS changes.
 */
export function ThemeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
