"use client";

import styled from "styled-components";

const Shell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
