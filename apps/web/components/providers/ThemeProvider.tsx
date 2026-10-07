import { ThemeProvider as SCThemeProvider } from "styled-components";
import { themes } from "@/lib/theme";
import { ThemeRuntimeProvider } from "./ThemeRuntimeProvider";

/**
 * Supplies a server-safe default theme so SSR can resolve `theme.*` tokens in
 * server components. A nested client runtime provider upgrades to the user's
 * preferred colour scheme after hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SCThemeProvider theme={themes.light}>
      <ThemeRuntimeProvider>{children}</ThemeRuntimeProvider>
    </SCThemeProvider>
  );
}
