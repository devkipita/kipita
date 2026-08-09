"use client";

import styled from "styled-components";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Section } from "@/components/ui/primitives";

const Prose = styled.article`
  background: ${({ theme }) => theme.color.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: clamp(28px, 5vw, 56px);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  max-width: 760px;
  margin: 0 auto;

  h1 {
    font-size: clamp(2rem, 5vw, 2.8rem);
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }

  h2 {
    font-size: 1.4rem;
    margin: 36px 0 12px;
  }

  p,
  li {
    color: ${({ theme }) => theme.color.textSoft};
    font-size: 1.05rem;
  }

  ul {
    padding-left: 20px;
  }

  .updated {
    color: ${({ theme }) => theme.color.muted};
    margin-bottom: 32px;
  }

  a {
    color: ${({ theme }) => theme.color.primary};
    font-weight: 600;
  }
`;

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <Section>
        <Container>
          <Prose>{children}</Prose>
        </Container>
      </Section>
      <SiteFooter mood="slate" />
    </>
  );
}
