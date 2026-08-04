"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import styled from "styled-components";
import { Brand } from "@/components/ui/Brand";
import { Badge, Container, SmallButton } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

const Bar = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;

const Inner = styled(Container)`
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Right = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

export function AdminBar({ name }: { name?: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Bar>
      <Inner>
        <Brand href="/admin" label="Kipita Admin" />
        <Right>
          {name && <Badge>{name}</Badge>}
          <SmallButton $variant="reject" onClick={signOut}>
            <LogOut size={16} strokeWidth={2.2} />
            Sign out
          </SmallButton>
        </Right>
      </Inner>
    </Bar>
  );
}
