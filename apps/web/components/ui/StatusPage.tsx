"use client";

import Link from "next/link";
import styled from "styled-components";

const Wrap = styled.main`
  display: flex;
  min-height: 70vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 64px 20px;
  text-align: center;
  color: ${({ theme }) => theme.color.text};
`;

const Code = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.primary};
`;

const Title = styled.h1`
  margin: 0;
  max-width: 18ch;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: clamp(30px, 5vw, 44px);
  line-height: 1.1;
  letter-spacing: -0.02em;
`;

const Lead = styled.p`
  margin: 0;
  max-width: 46ch;
  font-size: 17px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.muted};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 10px;
`;

const Primary = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 13px 26px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-size: 16px;
  font-weight: 700;
`;

const Secondary = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 13px 26px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.color.outlineVariant};
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
`;

export function StatusPage({
  code,
  title,
  lead,
  onRetry,
}: {
  code: string;
  title: string;
  lead: string;
  onRetry?: () => void;
}) {
  return (
    <Wrap>
      <Code>{code}</Code>
      <Title>{title}</Title>
      <Lead>{lead}</Lead>
      <Row>
        <Primary href="/home">Find a ride</Primary>
        {onRetry ? (
          <Secondary type="button" onClick={onRetry}>
            Try again
          </Secondary>
        ) : null}
      </Row>
    </Wrap>
  );
}
