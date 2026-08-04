import "styled-components";
import type { AppTheme } from "./theme";

// Teach styled-components about our token shape so `theme.color.*` is typed
// everywhere `styled`/`css`/`useTheme` is used — no per-file generics needed.
declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}
