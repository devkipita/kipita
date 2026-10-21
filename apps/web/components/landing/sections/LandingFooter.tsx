import styled from "styled-components";
import Link from "next/link";
import { nocturne } from "../nocturne";
import { Brand } from "../../ui/Brand";
import { SITE } from "@/lib/site";
import { LEGAL_TABS } from "@/lib/legal";

const Footer = styled.footer`
  padding: 58px max(34px, calc((100% - 1212px) / 2)) 100px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.onGreen};

  a {
    text-decoration: none;
  }

  @media (max-width: 640px) {
    padding: 45px 24px calc(100px + env(safe-area-inset-bottom));
  }
`;

const Top = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 45px;
  padding-bottom: 45px;

  @media (max-width: 640px) {
    display: block;
  }
`;

const BrandSlot = styled.div`
  > a {
    display: block;
    width: fit-content;
    color: inherit;
  }
  > a img {
    display: block;
    width: auto;
    height: 34px;
  }
`;

const Tagline = styled.p`
  max-width: 410px;
  margin: 0;
  line-height: 1.6;
  color: ${nocturne.onGreenMuted};

  @media (max-width: 640px) {
    margin: 18px 0 25px;
  }
`;

const Links = styled.nav`
  display: flex;
  gap: 8px;

  a {
    padding: 9px;
    color: inherit;
    font-weight: 600;
    transition: color 0.2s ease;
  }
  a:hover {
    color: ${nocturne.lime};
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;

    a {
      padding: 6px 0;
    }
  }
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  color: ${nocturne.onGreenMuted};

  a {
    color: inherit;
    transition: color 0.2s ease;
  }
  a:hover {
    color: ${nocturne.lime};
  }

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const LegalRow = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export function LandingFooter() {
  return (
    <Footer>
      <Top>
        <BrandSlot>
          <Brand href="/" light />
        </BrandSlot>
        <Tagline>
          Making travel across Kenya more affordable, social, and sustainable.
        </Tagline>
        <Links aria-label="Footer navigation">
          <Link href="/home">Find a ride</Link>
          <Link href="/publish">Publish a ride</Link>
          <Link href="/alerts">Road alerts</Link>
          <Link href="/#routes">Popular routes</Link>
        </Links>
      </Top>

      <Bottom>
        <span>© 2026 Kipita. Made for Kenya.</span>
        <LegalRow>
          {LEGAL_TABS.map((link, i) => (
            <span key={link.href}>
              <Link href={link.href}>
                {"footerLabel" in link ? link.footerLabel : link.label}
              </Link>
              {i < LEGAL_TABS.length - 1 ? " ·" : null}
            </span>
          ))}
          <span>
            · <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          </span>
        </LegalRow>
      </Bottom>
    </Footer>
  );
}
