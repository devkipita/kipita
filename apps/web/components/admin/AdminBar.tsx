"use client";

import { useEffect, useState } from "react";
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

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  overflow: hidden;
  flex: none;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.bgAlt};
  color: ${({ theme }) => theme.color.primaryDark};
  font-weight: 800;
  font-size: 0.95rem;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export function AdminBar({ name, image }: { name?: string; image?: string }) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const initial = name?.trim().charAt(0).toUpperCase() || "A";
  const showImage = Boolean(image) && !imageFailed;

  return (
    <Bar>
      <Inner>
        <Brand href="/admin" label="Kipita Admin" />
        <Right>
          <Avatar aria-label={name ? `${name} avatar` : "Admin avatar"}>
            {showImage ? (
              <AvatarImage
                src={image}
                alt={name}
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
            ) : (
              initial
            )}
          </Avatar>
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
