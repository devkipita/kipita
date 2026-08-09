import styled from "styled-components";
import { ArrowUpRight, Briefcase, Compass, Shield } from "lucide-react";
import { nocturne } from "../nocturne";
import { Brand } from "../../ui/Brand";
import { FOOTER_SOCIALS } from "@/components/SiteFooter";
import { SITE, LEGAL_LINKS } from "@/lib/site";

const Footer = styled.footer`
  padding: 0 clamp(20px, 5vw, 72px) clamp(24px, 3vw, 44px);
  background: ${nocturne.bg};

  a {
    text-decoration: none;
  }

  @media (max-width: 640px) {
    padding: 0;
  }
`;

const FooterCard = styled.div`
  position: relative;
  max-width: 1360px;
  margin: 0 auto;
  border-radius: 36px;
  background: ${nocturne.greenDeep};
  border: 1px solid rgba(158, 197, 162, 0.14);
  box-shadow: 0 22px 64px rgba(0, 0, 0, 0.22);
  padding: clamp(40px, 5vw, 72px) clamp(28px, 4vw, 64px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(40px, 5vw, 64px);

  /* Faint brand-shape watermark drawn from the shared background sheet. */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("/backgrounds/white.svg");
    background-size: 420px;
    background-position: center;
    background-repeat: repeat;
    opacity: 0.05;
    pointer-events: none;
  }

  /* Keep all footer content above the watermark. */
  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const FooterCols = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 1.3fr) repeat(3, minmax(180px, 1fr));
  gap: 40px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  }
`;

const FooterBrand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 390px;

  > a {
    color: #fff;
    width: fit-content;
  }

  > a img {
    height: 36px;
    width: auto;
    display: block;
    align-self: flex-start;
  }

  p {
    margin: 0;
    max-width: 31ch;
    font-size: 18px;
    line-height: 1.55;
    letter-spacing: -0.01em;
    color: #d6e8d7;
  }
`;

const FooterSocials = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
`;

const FooterSocial = styled.a`
  width: 46px;
  height: 46px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0e0e0e;
  color: ${nocturne.lime};
  border: 1px solid rgba(199, 238, 85, 0.12);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  &:hover {
    transform: translateY(-1px);
    background: #111;
    border-color: rgba(199, 238, 85, 0.28);
  }
`;

const FooterCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FooterColTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 232, 215, 0.82);
`;

const FooterTitleIcon = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${nocturne.lime};
  background: rgba(199, 238, 85, 0.08);

  svg {
    width: 14px;
    height: 14px;
    stroke-width: 2.2;
  }
`;

const FooterLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #f4f6f1;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;

  svg {
    flex: none;
    width: 22px;
    height: 22px;
    stroke-width: 2.1;
    color: rgba(214, 232, 215, 0.74);
    opacity: 0.9;
    transition:
      transform 0.2s ease,
      color 0.2s ease,
      opacity 0.2s ease;
  }

  &:hover {
    color: ${nocturne.lime};

    svg {
      transform: translate(1px, -1px);
      color: ${nocturne.lime};
      opacity: 1;
    }
  }
`;

const FooterBottomLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 18px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
`;

const FooterBottomLink = styled.a`
  font-size: 15px;
  color: #d6e8d7;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;

  &:hover {
    color: ${nocturne.lime};
  }
`;

const FooterBottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 28px;
  border-top: 1px solid ${nocturne.green};

  span {
    font-size: 15px;
    color: #d6e8d7;
    letter-spacing: -0.01em;
  }

  @media (max-width: 640px) {
    align-items: flex-start;
    justify-content: flex-start;
    gap: 14px;
    padding-bottom: 76px;
  }
`;

export function LandingFooter() {
  return (
    <Footer>
      <FooterCard>
        <FooterCols>
          <FooterBrand>
            <Brand href="#top" light />
            <p>
              Kipita connects two people already moving in the same direction.
              Not a taxi. A shared road.
            </p>
            <FooterSocials>
              {FOOTER_SOCIALS.map(({ label, href, Icon }) => (
                <FooterSocial
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <Icon size={20} fill="#e5ffc3" />
                </FooterSocial>
              ))}
            </FooterSocials>
          </FooterBrand>

          <FooterCol>
            <FooterColTitle>
              <FooterTitleIcon>
                <Compass />
              </FooterTitleIcon>
              Product
            </FooterColTitle>
            <FooterLink href="#find">
              <span>Find a ride</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink href="#rides">
              <span>Ride requests</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink href="#alerts">
              <span>Road alerts</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink href="#download">
              <span>Get the app</span>
              <ArrowUpRight />
            </FooterLink>
          </FooterCol>

          <FooterCol>
            <FooterColTitle>
              <FooterTitleIcon>
                <Briefcase />
              </FooterTitleIcon>
              Business
            </FooterColTitle>
            <FooterLink href="#contact">
              <span>Drive with Kipita</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink
              href={`mailto:${SITE.supportEmail}?subject=Corporate%20shuttles`}
            >
              <span>Corporate shuttles</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink
              href={`mailto:${SITE.supportEmail}?subject=Kipita%20partnership`}
            >
              <span>Partnerships</span>
              <ArrowUpRight />
            </FooterLink>
            <FooterLink
              href={`mailto:${SITE.supportEmail}?subject=Press%20inquiry`}
            >
              <span>Press</span>
              <ArrowUpRight />
            </FooterLink>
          </FooterCol>

          <FooterCol>
            <FooterColTitle>
              <FooterTitleIcon>
                <Shield />
              </FooterTitleIcon>
              Legal
            </FooterColTitle>
            {LEGAL_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                <span>{link.label}</span>
                <ArrowUpRight />
              </FooterLink>
            ))}
          </FooterCol>
        </FooterCols>

        <FooterBottom>
          <span>© 2026 Kipita Technologies Ltd · Nairobi, Kenya</span>
          <FooterBottomLinks>
            <FooterBottomLink href={SITE.websiteUrl}>
              kipita.app
            </FooterBottomLink>
            <FooterBottomLink href={`mailto:${SITE.supportEmail}`}>
              {SITE.supportEmail}
            </FooterBottomLink>
          </FooterBottomLinks>
        </FooterBottom>
      </FooterCard>
    </Footer>
  );
}
