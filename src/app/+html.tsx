import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Web-only HTML shell (ignored on native). Expo Router renders every web page
 * inside this document.
 *
 * The key reason this file exists: iOS Safari auto-zooms into any focused
 * <input>/<textarea> whose font-size is under 16px. react-native-web renders
 * our TextInputs (many at 14px) as real DOM inputs, so tapping a field to type
 * would zoom the page. Forcing a 16px minimum on web kills that zoom without
 * touching native styling and without disabling pinch-zoom (we deliberately
 * keep the viewport user-scalable for accessibility).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: NO_ZOOM_INPUT_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// `!important` is required: react-native-web writes font-size as an inline
// style, which would otherwise win over a plain stylesheet rule.
const NO_ZOOM_INPUT_CSS = `
input, textarea, select {
  font-size: 16px !important;
}
`;
