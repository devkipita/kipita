"use client";

import { useEffect } from "react";
import { setPageTitle } from "@/lib/nav/page-title";

export function PageTitle({ title, back, backLabel }: { title: string; back?: string; backLabel?: string }) {
  useEffect(() => {
    setPageTitle({ title, back, backLabel });
    return () => setPageTitle(null);
  }, [title, back, backLabel]);
  return null;
}
