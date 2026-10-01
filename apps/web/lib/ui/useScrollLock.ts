"use client";

import { useEffect } from "react";

let lockCount = 0;
let lockedScrollY = 0;

export function lockScroll(): void {
  if (lockCount++ > 0) return;
  lockedScrollY = window.scrollY;
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  const { style } = document.body;
  style.position = "fixed";
  style.top = `-${lockedScrollY}px`;
  style.left = "0";
  style.right = "0";
  style.overflow = "hidden";
  if (gutter > 0) style.paddingRight = `${gutter}px`;
}

export function unlockScroll(): void {
  if (--lockCount > 0) return;
  lockCount = 0;
  const { style } = document.body;
  style.position = "";
  style.top = "";
  style.left = "";
  style.right = "";
  style.overflow = "";
  style.paddingRight = "";
  window.scrollTo(0, lockedScrollY);
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
