import type { ReactNode } from "react";
import { PublicShell } from "@/components/nav/PublicShell";
import { LegalHeader } from "@/components/legal/LegalHeader";

export const dynamic = "force-dynamic";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <LegalHeader />
      {children}
    </PublicShell>
  );
}
