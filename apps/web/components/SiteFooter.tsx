import Link from "next/link";
import styled from "styled-components";
import { Compass, Cookie, FileText, HandCoins, ChatCircle as MessageCircle, ShieldCheck } from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import { SITE, LEGAL_LINKS } from "@/lib/site";
import { Brand } from "@/components/ui/Brand";
import { Container } from "@/components/ui/primitives";
import {
  InstagramIcon,
  XIcon,
  WhatsappIcon,
  MailIcon,
} from "@/components/landing/icons";

// An icon per link, matched to its meaning (cookie → Cookie Policy, …).
const LEGAL_ICONS: Record<string, LucideIcon> = {
  "/legal/privacy": ShieldCheck,
  "/legal/terms": FileText,
  "/legal/cookies": Cookie,
  "/legal/refunds": HandCoins,
};

// Each page gives its footer its own mood — a colour + matching brand-shape
// watermark from /backgrounds — deliberately distinct from the landing's
// deep-green footer. Help is warm brown; legal is dark slate; and so on.
export type FooterMood = "brown" | "slate";

const MOODS: Record<
  FooterMood,
  { bg: string; text: string; link: string; svg: string; opacity: number }
> = {
  brown: {
    bg: "#2b211a",
    text: "#e9ddc9",
    link: "#f2ead9",
    svg: "/backgrounds/brown.svg",
    opacity: 0.06,
  },
  slate: {
    bg: "#2f353d",
    text: "#dbe0e6",
    link: "#f0f3f6",
    svg: "/backgrounds/muted.svg",
    opacity: 0.55,
  },
};

// Placeholder social URLs — swap in the real handles when they exist.
export const FOOTER_SOCIALS = [
  {
    label: "Instagram",
    href: "https://instagram.com/kipita",
    Icon: InstagramIcon,
  },
  { label: "X", href: "https://x.com/kipita", Icon: XIcon },
  { label: "WhatsApp", href: "https://wa.me/254700000000", Icon: WhatsappIcon },
  { label: "Email", href: `mailto:${SITE.supportEmail}`, Icon: MailIcon },
];

const Footer = styled.footer<{ $mood: FooterMood }>`
  position: relative;
  overflow: hidden;
  background: ${({ $mood }) => MOODS[$mood].bg};
  color: ${({ $mood }) => MOODS[$mood].text};
  padding: 72px 0 44px;
  font-size: 1.08rem;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url(${({ $mood }) => MOODS[$mood].svg});
    background-size: 420px;
    background-position: center;
    background-repeat: repeat;
    opacity: ${({ $mood }) => MOODS[$mood].opacity};
    pointer-events: none;
  }

  /* Keep footer content above the watermark. */
  > * {
    position: relative;
    z-index: 1;
  }

  /* Links inherit the mood's brighter link colour (the footer is always dark,
     so this must not depend on the page theme). */
  a {
    color: ${({ $mood }) => MOODS[$mood].link};
  }

  /* Column labels — clearly a label, not a link: small, uppercase, dimmed. */
  h4 {
    margin: 0 0 16px;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.55;
  }
`;

const Cols = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  justify-content: space-between;
`;

/* Navigable links — brighter than body text, medium weight, underline on
   hover so they read unmistakably as links. */
const Links = styled.div`
  display: grid;
  gap: 14px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    width: fit-content;
    color: inherit;
    font-size: 1.08rem;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.2s ease;

    svg {
      flex: none;
      opacity: 0.8;
    }

    &:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  }
`;

const Intro = styled.div`
  max-width: 340px;

  /* Body copy — dimmer and lighter weight so it never looks clickable. */
  p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.65;
    font-weight: 400;
    opacity: 0.72;
  }
`;

const FooterBrand = styled(Brand)`
  img {
    height: 48px;
  }
`;

const Socials = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 22px;
`;

const Social = styled.a`
  width: 54px;
  height: 54px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  color: inherit;
  background: #111;
  transition:
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0, 0, 0, 0.42);
  }

  svg {
    width: 28px;
    height: 28px;
    display: block;
  }
`;

const Copyright = styled.p`
  margin: 52px 0 0;
  font-size: 0.95rem;
  opacity: 0.5;
`;

export function SiteFooter({ mood = "brown" }: { mood?: FooterMood }) {
  return (
    <Footer $mood={mood}>
      <Container>
        <Cols>
          <Intro>
            <div style={{ marginBottom: 14 }}>
              <FooterBrand light />
            </div>
            <p>{SITE.description}</p>
            <Socials>
              {FOOTER_SOCIALS.map(({ label, href, Icon }) => (
                <Social
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <Icon size={20} />
                </Social>
              ))}
            </Socials>
          </Intro>

          <div>
            <h4>Legal</h4>
            <Links>
              {LEGAL_LINKS.map((l) => {
                const Icon = LEGAL_ICONS[l.href] ?? FileText;
                return (
                  <Link key={l.href} href={l.href}>
                    <Icon size={18} />
                    {l.label}
                  </Link>
                );
              })}
            </Links>
          </div>

          <div>
            <h4>Company</h4>
            <Links>
              <Link href="/help#chat">
                <MessageCircle size={18} />
                Chat with us
              </Link>
              <Link href="/help#start">
                <Compass size={18} />
                How it works
              </Link>
            </Links>
          </div>
        </Cols>

        <Copyright>
          © {new Date().getFullYear()} {SITE.name}. Made for Kenya.
        </Copyright>
      </Container>
    </Footer>
  );
}
