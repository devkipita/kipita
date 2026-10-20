import type { ReactNode } from "react";
import { PublicShell } from "@/components/nav/PublicShell";
import { LegalBody } from "@/components/legal/LegalBody";

export const dynamic = "force-dynamic";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <LegalBody>{children}</LegalBody>
    </PublicShell>
  );
}
