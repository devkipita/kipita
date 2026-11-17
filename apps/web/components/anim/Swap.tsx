"use client";

import type { ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { tween } from "@/lib/motion";

export function Swap({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.div
        key={id}
        className={className}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: tween.enter }}
        exit={{ opacity: 0, transition: tween.exit }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
