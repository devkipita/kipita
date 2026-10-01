"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { ArrowDown, ArrowUpRight, Compass, QuestionCircle as LifeBuoy, Envelope as Mail, MapPin, ChatCircle as MessageCircle, MagnifyingGlass as Search, ShieldCheck, Sparkle as Sparkles, UserPlus, Wallet } from "@/components/icons";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/anim/Reveal";
import { ChatSupport } from "@/components/help/ChatSupport";
import { SITE } from "@/lib/site";
import { fetchPublishedFaqs } from "@/lib/faqs";
import type { ToneName } from "@/lib/theme";

/* Brand shapes drift gently behind the hero — the same playful motion the
   landing uses, kept subtle so the copy stays legible. */
const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50% { transform: translate3d(0, -18px, 0) rotate(3deg); }
`;

/* ── Hero ─────────────────────────────────────────────────────────────── */

const Hero = styled.section`
  position: relative;
  /* Wider than the 1080px content column, and short — a wide banner, not a
     tall block. Vertical padding stays tight so height comes from the copy. */
  width: min(1280px, calc(100% - 40px));
  margin: 28px auto 20px;
  padding: clamp(28px, 3.5vw, 44px) clamp(24px, 5vw, 72px);
  border-radius: ${({ theme }) => theme.radius.xl};
  overflow: hidden;
  background: ${({ theme }) => theme.tone.deep.bg};
  color: ${({ theme }) => theme.tone.deep.on};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

/* Two layers of the brand-shape sheet, offset and drifting out of phase, give
   the banner depth without any extra assets. */
const HeroShapes = styled.div`
  position: absolute;
  inset: -20% -10%;
  background-image: url("/backgrounds/white.svg");
  background-size: clamp(520px, 60vw, 760px);
  opacity: 0.06;
  pointer-events: none;
  animation: ${drift} 22s ease-in-out infinite;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: inherit;
    background-size: inherit;
    background-position: 40% 60%;
    opacity: 0.6;
    animation: ${drift} 30s ease-in-out infinite reverse;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &::after {
      animation: none;
    }
  }
`;

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
`;

const HeroEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 16%, transparent);
`;

const HeroTitle = styled.h1`
  margin: 16px 0 0;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 0.98;
  letter-spacing: -0.03em;
  font-weight: 700;

  em {
    font-style: italic;
    font-weight: 500;
    color: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 82%, #ffffff);
  }
`;

const HeroLead = styled.p`
  margin: 14px auto 0;
  max-width: 44ch;
  font-size: clamp(1rem, 1.6vw, 1.15rem);
  line-height: 1.55;
  color: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 78%, transparent);
`;

const SearchBar = styled.form`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 560px;
  margin: 22px auto 0;
  padding: 6px 6px 6px 20px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1.5px solid color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 22%, transparent);
  transition: border-color 0.2s ease, background 0.2s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.tone.deep.on};
    background: rgba(0, 0, 0, 0.42);
  }

  svg {
    flex: none;
    color: ${({ theme }) => theme.tone.deep.on};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.tone.deep.on};
    font-family: inherit;
    font-size: 1rem;
    padding: 12px 0;

    &::placeholder {
      color: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 60%, transparent);
    }
    &:focus {
      outline: none;
    }
  }
`;

const SearchGo = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  cursor: pointer;
  background: ${({ theme }) => theme.tone.deep.on};
  color: ${({ theme }) => theme.tone.deep.bg};
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.06);
  }
  svg {
    color: inherit;
  }
`;

/* ── Hero topic chips (quick jumps — Uniswap-style) ───────────────────── */

const Topics = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 18px auto 0;
`;

const Topic = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  color: ${({ theme }) => theme.tone.deep.on};
  background: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 22%, transparent);
  transition: background 0.16s ease, transform 0.16s ease;

  &:hover {
    transform: translateY(-2px);
    background: color-mix(in srgb, ${({ theme }) => theme.tone.deep.on} 22%, transparent);
  }
  svg {
    flex: none;
  }
`;

/* ── Section scaffolding ──────────────────────────────────────────────── */

const Section = styled.section`
  padding: 44px 0;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
`;

const Title = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  margin: 0;
`;

const Kicker = styled.span`
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.primaryDark};
`;

/* ── Getting started — bold full-colour step cards ────────────────────── */

const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled.div<{ $tone: ToneName }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 30px 32px 32px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  /* Brighten the on-tone text toward white so it pops on the muted cards. */
  color: color-mix(in srgb, ${({ theme, $tone }) => theme.tone[$tone].on} 70%, #ffffff);

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .num {
    font-family: var(--font-space-grotesk), var(--font-dm-sans), system-ui, sans-serif;
    font-size: 3.2rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    opacity: 0.34;
  }
  .bubble {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 999px;
    background: color-mix(in srgb, ${({ theme, $tone }) => theme.tone[$tone].on} 14%, transparent);
  }
  h3 {
    margin: 8px 0 0;
    font-size: 1.4rem;
    letter-spacing: -0.01em;
  }
  p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.5;
    color: color-mix(in srgb, ${({ theme, $tone }) => theme.tone[$tone].on} 82%, #ffffff);
  }
`;

/* ── FAQ accordion ────────────────────────────────────────────────────── */

const Faq = styled.div`
  display: grid;
  gap: 12px;
`;

const Item = styled.div<{ $open: boolean }>`
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.line};
  overflow: hidden;
`;

const Q = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-weight: 700;
  font-size: 1.02rem;
  color: ${({ theme }) => theme.color.text};
  transition: background 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surface2};
  }
  &:hover .idx {
    background: ${({ theme, $open }) =>
      $open ? theme.color.primary : theme.color.primaryContainer};
    color: ${({ theme, $open }) =>
      $open ? theme.color.onPrimary : theme.color.onPrimaryContainer};
  }
  &:hover svg {
    color: ${({ theme }) => theme.color.primary};
  }

  .idx {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 999px;
    font-size: 1.25rem;
    font-weight: 800;
    background: ${({ theme, $open }) =>
      $open ? theme.color.primary : theme.color.bgAlt};
    color: ${({ theme, $open }) =>
      $open ? theme.color.onPrimary : theme.color.primaryDark};
    transition: background 0.2s ease, color 0.2s ease;
  }
  .q {
    flex: 1;
  }
  /* Arrow points left when collapsed, rotates down when open. */
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.text};
    transition: transform 0.24s ease;
    transform: rotate(${({ $open }) => ($open ? "0deg" : "90deg")});
  }
`;

const A = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-rows 0.28s ease;

  & > div {
    overflow: hidden;
  }
  p {
    margin: 0;
    padding: 0 22px 22px 84px;
    color: ${({ theme }) => theme.color.textSoft};
    line-height: 1.6;
  }
`;

const Empty = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.color.muted};
  padding: 48px 0;
`;

/* ── Contact cards ────────────────────────────────────────────────────── */

const Support = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

const ContactCard = styled.a<{ $tone: ToneName }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    border: 1px solid ${({ theme }) => theme.color.line};
  }
  .chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    flex: none;
    background: ${({ theme, $tone }) => theme.tone[$tone].on};
    color: ${({ theme, $tone }) => theme.tone[$tone].bg};
  }
  b {
    display: block;
    font-size: 1.02rem;
  }
  small {
    color: color-mix(in srgb, ${({ theme, $tone }) => theme.tone[$tone].on} 76%, transparent);
  }
`;

/* ── Data ─────────────────────────────────────────────────────────────── */

const CATS: {
  icon: typeof Compass;
  t: string;
  d: string;
  href: string;
  tone: ToneName;
}[] = [
  { icon: Compass, t: "Getting started", d: "New here? Set up and take your first ride.", href: "#start", tone: "green" },
  { icon: Sparkles, t: "Popular questions", d: "Answers to what riders ask most.", href: "#faq", tone: "amber" },
  { icon: ShieldCheck, t: "Trust & safety", d: "How we keep every trip and payment safe.", href: "#faq", tone: "blue" },
  { icon: LifeBuoy, t: "Get help", d: "Chat with our support team.", href: "#chat", tone: "lav" },
];

const HOW: { icon: typeof UserPlus; t: string; d: string; tone: ToneName }[] = [
  { icon: UserPlus, t: "Create your account", d: "Sign up with email or phone in seconds — set a password and add a photo.", tone: "green" },
  { icon: Search, t: "Find your ride", d: "Search your route and pick a driver heading your way at a price you like.", tone: "amber" },
  { icon: Wallet, t: "Pay with M-Pesa", d: "Your fare is held safely in escrow and only released once the trip is done.", tone: "lav" },
  { icon: MapPin, t: "Travel together", d: "Meet at the pickup point, share the ride, and rate each other after.", tone: "blue" },
];

type FaqItem = { question: string; answer: string };

// Fallback shown before the DB loads (or if the faqs table isn't there yet).
// The admin FAQ manager writes to the `faqs` table, which then overrides these.
const DEFAULT_FAQS: FaqItem[] = [
  { question: "How does payment work?", answer: "You pay with M-Pesa when you book. Kipita holds the fare in escrow and only releases it to the driver once your trip is completed — so your money is protected." },
  { question: "Is my ride safe?", answer: "Riders and drivers are verified, every trip is rated, and payments are escrow-protected. Share your trip details with a friend any time from the app." },
  { question: "Can I sign up with my phone number?", answer: "Yes. Choose the Phone tab on sign in, enter your Kenyan number, and we'll text you a 6-digit code to verify it." },
  { question: "How do I become a driver?", answer: "Create an account, then submit your licence and ID for KYC verification from the app. Once approved, you can start offering seats." },
  { question: "What if I need to cancel?", answer: "You can cancel from your bookings. Refunds follow our refund policy — escrow-held fares are returned when eligible." },
  { question: "How do I change my email or phone?", answer: "Head to your profile, edit your details, and confirm the change via the code or link we send you." },
];

export function HelpContent() {
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);

  // Pull the live, admin-managed FAQs; keep the defaults if the table is empty
  // or unreachable so the section always renders something.
  useEffect(() => {
    let alive = true;
    fetchPublishedFaqs()
      .then((rows) => {
        if (alive && rows.length) {
          setFaqs(rows.map((r) => ({ question: r.question, answer: r.answer })));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q),
    );
  }, [query, faqs]);

  return (
    <>
      <SiteNav />
      <Hero>
        <HeroShapes aria-hidden />
          <HeroInner>
            <HeroEyebrow>
              <LifeBuoy size={15} />
              Help center
            </HeroEyebrow>
            <HeroTitle>
              Questions?{" "}
              <em>We&apos;re here to help.</em>
            </HeroTitle>
            <HeroLead>
              Everything you need to ride, share, and get moving with {SITE.name}.
            </HeroLead>
          </HeroInner>
          <SearchBar
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              document
                .getElementById("faq")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Search size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles…"
              aria-label="Search help articles"
            />
            <SearchGo type="submit" aria-label="Search">
              <ArrowUpRight size={20} />
            </SearchGo>
          </SearchBar>
          <Topics>
            {CATS.map(({ icon: Icon, t, href }) => (
              <Topic key={t} href={href}>
                <Icon size={15} />
                {t}
              </Topic>
            ))}
          </Topics>
      </Hero>

      <Container>
        <Section id="start">
          <SectionHead>
            <div>
              <Kicker>First ride in four steps</Kicker>
              <Title>Getting started</Title>
            </div>
          </SectionHead>
          <Reveal>
            <Steps>
              {HOW.map(({ icon: Icon, t, d, tone }, i) => (
                <Step key={t} $tone={tone}>
                  <div className="top">
                    <span className="num">{i + 1}</span>
                    <span className="bubble">
                      <Icon size={26} />
                    </span>
                  </div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </Step>
              ))}
            </Steps>
          </Reveal>
        </Section>

        <Section id="faq">
          <SectionHead>
            <div>
              <Kicker>Frequently asked</Kicker>
              <Title>
                {query.trim() ? `Results for “${query.trim()}”` : "Common questions"}
              </Title>
            </div>
          </SectionHead>
          {results.length ? (
            <Faq>
              {results.map((f) => {
                const idx = faqs.indexOf(f);
                const isOpen = open === idx;
                return (
                  <Item key={f.question} $open={isOpen}>
                    <Q
                      $open={isOpen}
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <span className="idx">{idx + 1}</span>
                      <span className="q">{f.question}</span>
                      <ArrowDown size={26} />
                    </Q>
                    <A $open={isOpen}>
                      <div>
                        <p>{f.answer}</p>
                      </div>
                    </A>
                  </Item>
                );
              })}
            </Faq>
          ) : (
            <Empty>
              No articles match “{query.trim()}”. Try a different word, or reach
              our team below.
            </Empty>
          )}
        </Section>

        <Section id="chat">
          <SectionHead>
            <div>
              <Kicker>Still stuck?</Kicker>
              <Title>Chat with support</Title>
            </div>
          </SectionHead>
          <ChatSupport />
        </Section>

        <Section id="contact">
          <SectionHead>
            <div>
              <Kicker>Prefer email?</Kicker>
              <Title>Other ways to reach us</Title>
            </div>
          </SectionHead>
          <Reveal>
            <Support>
              <ContactCard href={`mailto:${SITE.supportEmail}`} $tone="green">
                <span className="chip">
                  <Mail size={22} />
                </span>
                <div>
                  <b>Email support</b>
                  <small>{SITE.supportEmail}</small>
                </div>
              </ContactCard>
              <ContactCard href="#chat" $tone="tan">
                <span className="chip">
                  <MessageCircle size={22} />
                </span>
                <div>
                  <b>Live chat</b>
                  <small>Message our team right here</small>
                </div>
              </ContactCard>
            </Support>
          </Reveal>
        </Section>
      </Container>
      <SiteFooter />
    </>
  );
}
