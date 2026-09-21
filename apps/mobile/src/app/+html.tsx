import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Web-only HTML shell (ignored on native).
 *
 * iOS Safari auto-zooms into any focused <input>/<textarea> whose font-size is
 * under 16px, and react-native-web renders our TextInputs as real DOM inputs —
 * so a 14px field zooms the page the moment you tap it, and the zoom never
 * animates back out.
 *
 * **This file is not the fix.** Expo only renders `+html.tsx` when
 * `web.output` is `"static"`; in the default SPA mode it serves its own
 * template and everything below is ignored. The actual fix is
 * `typography.input` (16px) applied to every TextInput — see
 * `src/theme/typography.ts`. The rule here is a safety net for the day this
 * app switches to static output, and for any stray input that misses the token.
 *
 * Note the viewport deliberately stays scalable: killing the zoom by disabling
 * pinch-to-zoom would trade one bug for an accessibility failure.
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
