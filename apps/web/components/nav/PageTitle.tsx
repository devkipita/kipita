"use client";

import { useEffect } from "react";
import { setPageTitle } from "@/lib/nav/page-title";

export function PageTitle({ title, back }: { title: string; back: string }) {
  useEffect(() => {
    setPageTitle({ title, back });
    return () => setPageTitle(null);
  }, [title, back]);
  return null;
}
