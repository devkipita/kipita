"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

/**
 * Collects styled-components' server-rendered CSS and flushes it into the
 * document <head> during streaming, so the first paint is styled and there is
 * no hydration flash. Required for styled-components under the App Router.
 * See: https://nextjs.org/docs/app/building-your-application/styling/css-in-js
 */
export function StyledRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  // On the client, render children directly — styled-components manages the
  // stylesheet itself and StyleSheetManager without a sheet would error.
  if (typeof window !== "undefined") return <>{children}</>;

  return (
    <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>
  );
}
