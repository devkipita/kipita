import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect on the client (so GSAP can set the hidden start-state before
 * paint — no flash), useEffect on the server (avoids the SSR warning).
 */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
