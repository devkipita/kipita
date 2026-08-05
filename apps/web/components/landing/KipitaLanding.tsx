import styled from "styled-components";
import {
  ArrowUpRight,
  Briefcase,
  Compass,
  Shield,
} from "lucide-react";
import { landingFonts } from "./fonts";
import { nocturne, pulse, dash } from "./nocturne";
import { Brand } from "../ui/Brand";
import { SITE, LEGAL_LINKS } from "@/lib/site";
import { Reveal } from "../anim/Reveal";
import { Parallax } from "../anim/Parallax";
import { TrickleHeading } from "./TrickleHeading";
import { HeroCarousel } from "./HeroCarousel";
import { CountUp } from "./CountUp";
import { WaitlistForm } from "./WaitlistForm";
import { ContactDock } from "./ContactDock";
import {
  BusIcon,
  BusMini,
  PersonIcon,
  WarningIcon,
  CloudIcon,
  InstagramIcon,
  XIcon,
  AppleIcon,
  AndroidIcon,
  WhatsappIcon,
  CommentIcon,
  HeartIcon,
  ViewsIcon,
  ShareIcon,
} from "./icons";

/* ══════════════════════════════════════════════════════════════
   Kipita Landing — "nocturne" dark theme, co-located styled-components.
   Scoped: none of this leaks into the light legal/admin pages.
   ══════════════════════════════════════════════════════════════ */

const Root = styled.div`
  position: relative;
  min-height: 100vh;
  background: ${nocturne.bg};
  color: ${nocturne.cream};
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  overflow-x: hidden;

  ::selection {
    background: ${nocturne.green};
    color: ${nocturne.cream};
  }

  :focus-visible {
    outline: 2px solid ${nocturne.sage};
    outline-offset: 3px;
  }
`;

const Eyebrow = styled.span<{ $tone?: "green" | "tan" | "lime" }>`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ $tone }) =>
    $tone === "green"
      ? nocturne.green
      : $tone === "tan"
        ? nocturne.tan
        : $tone === "lime"
          ? nocturne.lime
          : "inherit"};
`;

/* ══════════════ Nav ══════════════ */
const Nav = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 22px clamp(14px, 5vw, 72px);
  pointer-events: none;

  @media (max-width: 640px) {
    padding-top: 18px;
    padding-bottom: 18px;
  }
`;

const NavLogo = styled.div`
  display: block;
  pointer-events: auto;

  a {
    color: ${nocturne.cream};
  }

  svg {
    height: 132px;
    width: auto;
    display: block;
  }

  @media (max-width: 640px) {
    svg {
      height: 112px;
    }
  }
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(12px, 2.4vw, 38px);
  pointer-events: auto;
`;

const NavLink = styled.a`
  font-size: 15px;
  font-weight: 500;
  color: ${nocturne.cream};
  letter-spacing: 0.01em;
  transition: color 0.2s ease;

  &:hover {
    color: ${nocturne.sage};
  }
`;

const NavCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 15px;
  font-weight: 700;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
    color: ${nocturne.greenDeep};
  }
`;

/* ══════════════ Hero ══════════════ */
const Hero = styled.section`
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  align-items: center;
  gap: 40px;
  padding: 150px clamp(16px, 5vw, 72px) 80px;
  overflow: hidden;

  @media (max-width: 900px) {
    padding-top: 116px;
  }
`;

const HeroPattern = styled.div`
  position: absolute;
  inset: -10%;
  background-image: url("/landing/car-pattern-t.png");
  background-size: 520px;
  opacity: 0.13;
  pointer-events: none;
`;

const HeroPeopleLeft = styled(Parallax)`
  position: absolute;
  left: -70px;
  bottom: -40px;
  width: min(300px, 22vw);
  opacity: 0.5;
  pointer-events: none;

  @media (max-width: 900px) {
    display: none;
  }
`;

const HeroPeopleRight = styled(Parallax)`
  position: absolute;
  right: -50px;
  bottom: -60px;
  width: min(280px, 20vw);
  opacity: 0.35;
  pointer-events: none;

  @media (max-width: 900px) {
    display: none;
  }
`;

const HeroCopy = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 30px;
  max-width: 760px;

  @media (max-width: 640px) {
    gap: 24px;
  }
`;

const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  border: 1px solid ${nocturne.green};

  span:last-child {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${nocturne.sage};
  }
`;

const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${nocturne.sage};
  animation: ${pulse} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Display = styled(TrickleHeading)`
  margin: 0;
  font-weight: 700;
  font-size: clamp(44px, 8.4vw, 148px);
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
  text-wrap: balance;

  & span {
    display: inline-block;
  }
  & .accent-sage {
    color: ${nocturne.sage};
  }
  & .accent-tan {
    color: ${nocturne.tan};
  }
`;

const HeroLead = styled.p`
  margin: 0;
  max-width: 540px;
  font-size: clamp(17px, 1.35vw, 21px);
  line-height: 1.55;
  color: ${nocturne.muted};
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`;

const BtnLime = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 36px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 17px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${nocturne.cream};
  }
`;

const BtnGreen = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 36px;
  border-radius: 999px;
  background: ${nocturne.greenDeep};
  color: ${nocturne.lime};
  font-size: 17px;
  font-weight: 700;
  transition: background 0.2s ease;

  &:hover {
    background: ${nocturne.green};
  }
`;

const HeroStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 26px;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: ${nocturne.cream};
  }
  span {
    font-size: 13px;
    color: ${nocturne.muted3};
  }
`;

const HeroDivider = styled.div`
  width: 1px;
  height: 34px;
  background: #2a2a2a;
`;

const HeroVisual = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(24px, 3vw, 40px);
`;

const HeroVisualInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* ══════════════ Section shells ══════════════ */
const Section = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 160px) clamp(20px, 5vw, 72px);
  background: ${nocturne.bg};
`;

const Wrap = styled.div`
  max-width: 1360px;
  margin: 0 auto;
`;

const H2 = styled.h2`
  margin: 0;
  font-weight: 700;
  font-size: clamp(40px, 5.4vw, 88px);
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
`;

const H3 = styled.h3`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: ${nocturne.cream};
`;

/* ── How it works ── */
const HowStack = styled(Wrap)`
  display: flex;
  flex-direction: column;
  gap: clamp(48px, 6vw, 84px);
`;

const HowHead = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 48px;
  align-items: end;
`;

const HowHeadCol = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 22px;

  ${H2} {
    line-height: 0.98;
  }
`;

const HowLead = styled.p`
  margin: 0;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: ${nocturne.muted};
  max-width: 520px;
`;

const MatchCard = styled.div`
  position: relative;
  padding: clamp(32px, 4vw, 60px);
  border-radius: 32px;
  background: ${nocturne.surface};
  overflow: hidden;
`;

const MatchGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  align-items: center;
  gap: clamp(20px, 4vw, 60px);
`;

const MatchCol = styled.div<{ $right?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  ${({ $right }) => $right && `align-items: flex-end; text-align: right;`}

  p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: ${nocturne.muted2};
    max-width: 340px;
  }
`;

const MatchWho = styled.div<{ $right?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  ${({ $right }) => $right && `flex-direction: row-reverse;`}

  span {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 22px;
    font-weight: 600;
    color: ${nocturne.cream};
  }
`;

const MatchAvatar = styled.div<{ $tone: "green" | "tan" }>`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  background: ${({ $tone }) =>
    $tone === "green" ? nocturne.green : nocturne.tan};
`;

const MatchMid = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 120px;

  span {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${nocturne.green};
  }
`;

const MatchRing = styled.circle`
  animation: ${dash} 2.4s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Steps = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: clamp(16px, 1.6vw, 24px);
`;

const StepCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 32px;
  border-radius: 24px;
  background: ${nocturne.surface};

  p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: ${nocturne.muted2};
  }
`;

const StepNum = styled.span`
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: ${nocturne.green};
`;

/* ── Ride requests ── */
const RidesSection = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) 0;
  background: ${nocturne.bg};
  overflow: hidden;
`;

const RidesPattern = styled.div`
  position: absolute;
  inset: -15% 0;
  background-image: url("/landing/car-pattern-t.png");
  background-size: 640px;
  opacity: 0.07;
  pointer-events: none;
`;

const RidesHead = styled.div`
  position: relative;
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 72px);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
`;

const RidesHeadCol = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const LinkOutline = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 30px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid ${nocturne.lime};
  color: ${nocturne.lime};
  font-size: 16px;
  font-weight: 600;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${nocturne.lime};
    color: ${nocturne.greenDeep};
  }
`;

const RideTrack = styled.div`
  position: relative;
  margin-top: 44px;
  display: flex;
  justify-content: safe center;
  gap: 20px;
  overflow-x: auto;
  padding: 8px clamp(20px, 5vw, 72px) 28px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const RideCard = styled.article`
  flex: 0 0 clamp(300px, 26vw, 380px);
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 28px;
  padding: 30px;
  border-radius: 28px;
  min-height: 340px;
  transition: transform 0.25s ease;

  &:hover {
    transform: translateY(-6px);
  }
`;

const RideTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const RideWho = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const RideAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  flex: none;
`;

const RideName = styled.div`
  display: flex;
  flex-direction: column;

  b {
    font-size: 15px;
    font-weight: 600;
  }
  span {
    font-size: 12px;
  }
`;

const RideTag = styled.span`
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const RideRoute = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RideCity = styled.span`
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: clamp(26px, 2.2vw, 34px);
  font-weight: 700;
  line-height: 1.05;
`;

const RideMeta = styled.span`
  font-size: 14px;
`;

const RideFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const RidePrice = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 999px;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  overflow: hidden;
`;

/* Two labels share one grid cell so the pill keeps a stable width while the
   price swaps to a "Get ride" CTA on card hover. */
const PriceFlip = styled.span`
  position: relative;
  display: inline-grid;
  align-items: center;
  overflow: hidden;
`;

const PriceLine = styled.span`
  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition:
    transform 0.4s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.4s ease;
  will-change: transform, opacity;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const PricePrimary = styled(PriceLine)`
  ${RideCard}:hover & {
    transform: translateY(-120%);
    opacity: 0;
  }
`;

const PriceCta = styled(PriceLine)`
  transform: translateY(120%);
  opacity: 0;

  ${RideCard}:hover & {
    transform: translateY(0);
    opacity: 1;
  }
`;

const RideWhen = styled.span`
  font-size: 13px;
`;

/* ── Alerts (light section) ── */
const Alerts = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: #edf2dc;
`;

const AlertsHead = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 40px;
  align-items: end;
`;

const AlertsHeadCol = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const LiveTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  align-self: flex-start;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${nocturne.green};

  span:last-child {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${nocturne.cream};
  }
`;

const LiveTagDot = styled(PulseDot)`
  background: ${nocturne.cream};
  animation-duration: 1.6s;
`;

const AlertsTitle = styled(H2)`
  color: ${nocturne.greenDeep};
`;

const AlertsLead = styled.p`
  margin: 0;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: #3f5a46;
  max-width: 520px;
`;

const AlertGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px;
  margin-top: 48px;
`;

const AlertCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  border-radius: 24px;
  background: ${nocturne.surface2};
  border: 1px solid ${nocturne.line2};
`;

const AlertHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const AlertAvatar = styled.div`
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
`;

const AlertWho = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
`;

const AlertRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const AlertName = styled.span`
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const AlertMeta = styled.span`
  font-size: 14px;
  color: #7e857c;
`;

const AlertLoc = styled.span`
  font-size: 13px;
  color: #7e857c;
`;

const AlertChip = styled.span<{ $type: "traffic" | "accident" | "weather" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  ${({ $type }) =>
    $type === "traffic"
      ? `background: ${nocturne.tan}; color: #2e2416;`
      : $type === "accident"
        ? `background: #4a1518; color: #ff7d86; box-shadow: inset 0 0 0 1px rgba(255, 125, 134, 0.3);`
        : `background: ${nocturne.sage}; color: ${nocturne.greenDeep};`}
`;

const AlertBody = styled.p`
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: #c3c7c1;
`;

const AlertEngage = styled.div`
  display: flex;
  align-items: center;
  gap: 26px;
  padding-top: 12px;
  border-top: 1px solid ${nocturne.line2};
  margin-top: 2px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: #8e958c;
  }
`;

const AlertShare = styled.span`
  margin-left: auto;
  color: #6e7c66 !important;
`;

/* ── Stats ── */
const Stats = styled.section`
  position: relative;
  padding: clamp(80px, 9vw, 140px) clamp(20px, 5vw, 72px);
  background: ${nocturne.greenDeep};
  overflow: hidden;
`;

const StatsPeople = styled(Parallax)`
  position: absolute;
  right: -90px;
  top: -40px;
  width: min(360px, 26vw);
  opacity: 0.14;
  pointer-events: none;
`;

const StatsWrap = styled.div`
  position: relative;
  max-width: 1360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(40px, 5vw, 70px);
`;

const StatsTitle = styled.h2`
  margin: 0;
  max-width: 900px;
  font-size: clamp(36px, 4.6vw, 74px);
  line-height: 1;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
`;

const StatsGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: clamp(16px, 2vw, 32px);
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 34px 30px;
  border-radius: 26px;
`;

const StatNum = styled.div`
  display: flex;
  align-items: baseline;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: clamp(40px, 4.4vw, 68px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
`;

const StatUnit = styled.span`
  font-size: 0.55em;
  padding-right: 0.12em;
`;

const StatLabel = styled.span`
  font-size: 15px;
`;

/* ── Download ── */
const Download = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: ${nocturne.surface};
  overflow: hidden;
`;

const DownloadGrid = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  gap: clamp(40px, 6vw, 90px);
  align-items: center;
`;

const DownloadCopy = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: flex-start;
`;

const DownloadLead = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: ${nocturne.muted2};
`;

const StoreRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
`;

const StoreBtn = styled.a<{ $variant: "light" | "outline" }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  border-radius: 999px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  ${({ $variant }) =>
    $variant === "light"
      ? `
        background: ${nocturne.cream};
        color: ${nocturne.greenDeep};
        &:hover { background: ${nocturne.sage}; }
      `
      : `
        background: transparent;
        border: 1px solid #3a3a3a;
        color: ${nocturne.cream};
        &:hover { border-color: ${nocturne.sage}; color: ${nocturne.sage}; }
      `}
`;

const StoreLabel = styled.span`
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;

  small {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.7;
  }
  b {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-size: 17px;
    font-weight: 700;
  }
`;

const Phones = styled.div`
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  min-height: clamp(340px, 56vw, 520px);
`;

const Phone = styled.img<{ $pos: "left" | "right" | "center" }>`
  flex: none;
  border-radius: 26px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  ${({ $pos }) =>
    $pos === "center"
      ? `
        width: clamp(132px, 34vw, 250px);
        border-radius: 30px;
        border: 1px solid ${nocturne.green};
        z-index: 2;
        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
      `
      : $pos === "left"
        ? `
          width: clamp(104px, 27vw, 210px);
          transform: translateY(26px) rotate(-5deg);
          margin-right: clamp(-46px, -7vw, -24px);
        `
        : `
          width: clamp(104px, 27vw, 210px);
          transform: translateY(26px) rotate(5deg);
          margin-left: clamp(-46px, -7vw, -24px);
        `}
`;

/* ── Contact ── */
const Contact = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: ${nocturne.bg};
`;

const ContactStack = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 44px;
`;

const ContactHead = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 760px;

  p {
    margin: 0;
    font-size: clamp(16px, 1.25vw, 20px);
    line-height: 1.6;
    color: ${nocturne.muted2};
  }
`;

/* ── Footer ── */
const Footer = styled.footer`
  padding: 0 clamp(20px, 5vw, 72px) clamp(24px, 3vw, 44px);
  background: ${nocturne.bg};

  a {
    text-decoration: none;
  }
`;

const FooterCard = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  border-radius: 36px;
  background: ${nocturne.greenDeep};
  border: 1px solid rgba(158, 197, 162, 0.14);
  box-shadow: 0 22px 64px rgba(0, 0, 0, 0.22);
  padding: clamp(40px, 5vw, 72px) clamp(28px, 4vw, 64px);
  display: flex;
  flex-direction: column;
  gap: clamp(40px, 5vw, 64px);
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

  > a svg {
    height: 104px;
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
`;

const RIDES = [
  {
    card: "#2F6C4F",
    av: "#14392A",
    avText: "#9EC5A2",
    initials: "JM",
    name: "James Mwangi",
    nameC: "#DDF3B2",
    sub: "4.9 · 128 trips",
    subC: "#9EC5A2",
    tagBg: "#14392A",
    tagC: "#9EC5A2",
    tag: "Premium",
    from: "Nanyuki",
    to: "Nairobi CBD",
    cityC: "#9FE870",
    meta: "↓ 3h 20m · 4 seats left",
    metaC: "#9EC5A2",
    priceBg: "#FAF8F4",
    priceC: "#0E0E0E",
    price: "KES 3,000",
    when: "Today · 6:00 AM",
    whenC: "#9EC5A2",
  },
  {
    card: "#D4B896",
    av: "#0E0E0E",
    avText: "#D4B896",
    initials: "AO",
    name: "Aisha Odhiambo",
    nameC: "#0E0E0E",
    sub: "4.8 · 91 trips",
    subC: "#5C4E3B",
    tagBg: "#0E0E0E",
    tagC: "#D4B896",
    tag: "Common",
    from: "Nakuru",
    to: "Nairobi",
    cityC: "#0E0E0E",
    meta: "↓ 2h 40m · 2 seats left",
    metaC: "#5C4E3B",
    priceBg: "#0E0E0E",
    priceC: "#FAF8F4",
    price: "KES 1,500",
    when: "Today · 2:15 PM",
    whenC: "#5C4E3B",
  },
  {
    card: "#9FE870",
    av: "#14392A",
    avText: "#9FE870",
    initials: "BK",
    name: "Brian Kiptoo",
    nameC: "#14392A",
    sub: "4.7 · 54 trips",
    subC: "#4B6330",
    tagBg: "#14392A",
    tagC: "#9FE870",
    tag: "Budget",
    from: "Naivasha",
    to: "Nairobi",
    cityC: "#14392A",
    meta: "↓ 1h 30m · 3 seats left",
    metaC: "#4B6330",
    priceBg: "#14392A",
    priceC: "#9FE870",
    price: "KES 1,000",
    when: "Tomorrow · 7:30 AM",
    whenC: "#4B6330",
  },
  {
    card: "#9EC5A2",
    av: "#0E0E0E",
    avText: "#9EC5A2",
    initials: "WN",
    name: "Wanjiku Njeri",
    nameC: "#0E0E0E",
    sub: "5.0 · 203 trips",
    subC: "#2F6C4F",
    tagBg: "#2F6C4F",
    tagC: "#FAF8F4",
    tag: "Premium",
    from: "Eldoret",
    to: "Nairobi",
    cityC: "#0E0E0E",
    meta: "↓ 5h 10m · 1 seat left",
    metaC: "#2F6C4F",
    priceBg: "#0E0E0E",
    priceC: "#FAF8F4",
    price: "KES 3,000",
    when: "Fri · 5:45 AM",
    whenC: "#2F6C4F",
  },
];

const ALERTS = [
  {
    avBg: "#14392A",
    avC: "#9FE870",
    initials: "JM",
    name: "James Mwangi",
    handle: "@jmwangi",
    time: "· 32m",
    chip: "traffic" as const,
    chipLabel: "Traffic",
    loc: "Uhuru Highway, Nairobi",
    body: "Heavy traffic from Globe Roundabout to Nyayo Stadium — a stalled matatu is blocking the left lane. Expect 30–45 minutes. Haile Selassie is moving.",
    comments: 8,
    hearts: 42,
    views: 374,
  },
  {
    avBg: "#C0533F",
    avC: "#FAF8F4",
    initials: "AO",
    name: "Aisha Odhiambo",
    handle: "@aisha_o",
    time: "· 1h",
    chip: "accident" as const,
    chipLabel: "Accident",
    loc: "Thika Road, Safari Park",
    body: "Two-vehicle collision near Safari Park Hotel. One lane blocked inbound to Nairobi, emergency services on site. Use the Outer Ring detour.",
    comments: 12,
    hearts: 38,
    views: 512,
  },
  {
    avBg: "#2F6C4F",
    avC: "#9FE870",
    initials: "BK",
    name: "Brian Kiptoo",
    handle: "@bkiptoo",
    time: "· 2h",
    chip: "weather" as const,
    chipLabel: "Weather",
    loc: "Nakuru–Eldoret Highway",
    body: "Dense fog past Salgaa, visibility under 50 metres. Trucks crawling on the climbing lane. Drive with hazards, allow an extra hour.",
    comments: 21,
    hearts: 67,
    views: 891,
  },
];

const STATS = [
  {
    bg: "#FAF8F4",
    numC: "#14392A",
    labelC: "#5A6357",
    value: 24800,
    dec: 0,
    suffix: "+",
    label: "riders on Kipita",
  },
  {
    bg: "#D4B896",
    numC: "#2E2416",
    labelC: "#5C4E3B",
    value: 6300,
    dec: 0,
    suffix: "+",
    label: "verified drivers",
  },
  {
    bg: "#9EC5A2",
    numC: "#14392A",
    labelC: "#2F4A38",
    value: 42,
    dec: 0,
    suffix: "",
    label: "towns connected",
  },
  {
    bg: "#0E0E0E",
    numC: "#FAF8F4",
    labelC: "#8E918B",
    value: 18.4,
    dec: 1,
    prefix: "KES",
    suffix: "M",
    label: "saved on fuel by sharing",
  },
];

const chipIcon = {
  traffic: <BusMini size={12} />,
  accident: <WarningIcon size={12} />,
  weather: <CloudIcon size={12} />,
};

export function KipitaLanding() {
  return (
    <Root className={landingFonts}>
      {/* ── Nav ── */}
      <Nav>
        <NavLogo>
          <Brand href="#top" light />
        </NavLogo>
        <NavRight>
          <NavLink href="#rides">Rides</NavLink>
          <NavLink href="#alerts">Alerts</NavLink>
          <NavCta href="#download">Get the app</NavCta>
        </NavRight>
      </Nav>

      {/* ── Hero ── */}
      <Hero id="top">
        <HeroPattern aria-hidden />
        <HeroPeopleLeft amount={40}>
          <img
            src="/landing/people-left.png"
            alt=""
            style={{ width: "100%", display: "block" }}
          />
        </HeroPeopleLeft>
        <HeroPeopleRight amount={30}>
          <img
            src="/landing/people-right.png"
            alt=""
            style={{ width: "100%", display: "block" }}
          />
        </HeroPeopleRight>

        <HeroCopy>
          <LivePill>
            <PulseDot />
            <span>Ride · Share · Connect</span>
          </LivePill>

          <Display
            parts={[
              { text: "Ride." },
              { text: "Share.", className: "accent-sage" },
              { text: "Connect.", className: "accent-tan" },
            ]}
          />

          <Reveal stagger={0.12} delay={0.55}>
            <HeroLead>
              Kipita isn&apos;t a taxi. It&apos;s the seat that was already
              going your way. We match you with drivers heading to your
              destination — so you split the cost, skip the matatu chaos, and
              arrive with someone worth talking to.
            </HeroLead>
            <HeroActions>
              <BtnLime href="#download">Find a ride</BtnLime>
              <BtnGreen href="#rides">Offer a ride</BtnGreen>
            </HeroActions>
          </Reveal>
        </HeroCopy>

        <HeroVisual>
          <HeroVisualInner>
            <HeroCarousel />
          </HeroVisualInner>
          <Reveal delay={0.5}>
            <HeroStats>
              <HeroStat>
                <b>KES 1,000</b>
                <span>cheapest shared seat</span>
              </HeroStat>
              <HeroDivider />
              <HeroStat>
                <b>42</b>
                <span>towns connected</span>
              </HeroStat>
            </HeroStats>
          </Reveal>
        </HeroVisual>
      </Hero>

      {/* ── How it works ── */}
      <Section id="how">
        <HowStack>
          <HowHead>
            <HowHeadCol>
              <Eyebrow $tone="green">RideConnect</Eyebrow>
              <H2>
                Two people.
                <br />
                One direction.
              </H2>
            </HowHeadCol>
            <Reveal delay={0.1}>
              <HowLead>
                A driver is already leaving Nanyuki for Nairobi at six. Three
                seats are empty. You need one. Kipita puts you in the same
                place, agrees the fare before anyone moves, and holds the money
                until the trip ends.
              </HowLead>
            </Reveal>
          </HowHead>

          <Reveal delay={0.05}>
            <MatchCard>
              <MatchGrid>
                <MatchCol>
                  <MatchWho>
                    <MatchAvatar $tone="green">
                      <BusIcon size={24} fill="#FAF8F4" />
                    </MatchAvatar>
                    <span>The driver</span>
                  </MatchWho>
                  <p>
                    Posts the trip they were making anyway. Sets the seats, the
                    time and the price per seat. Fuel stops being a solo cost.
                  </p>
                </MatchCol>

                <MatchMid>
                  <svg
                    width="120"
                    height="120"
                    viewBox="0 0 120 120"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="#2A2A2A"
                      strokeWidth="1.5"
                    />
                    <MatchRing
                      cx="60"
                      cy="60"
                      r="52"
                      stroke="#9EC5A2"
                      strokeWidth="2"
                      strokeDasharray="14 26"
                    />
                    <circle cx="60" cy="60" r="26" fill="#14392A" />
                    <path
                      d="M52 60h16m-6-6 6 6-6 6"
                      stroke="#9EC5A2"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Matched</span>
                </MatchMid>

                <MatchCol $right>
                  <MatchWho $right>
                    <MatchAvatar $tone="tan">
                      <PersonIcon size={24} fill="#0E0E0E" />
                    </MatchAvatar>
                    <span>The passenger</span>
                  </MatchWho>
                  <p>
                    Searches the route, sees who&apos;s driving and what they
                    charge, chats, pays in the app. No haggling at the stage.
                  </p>
                </MatchCol>
              </MatchGrid>
            </MatchCard>
          </Reveal>

          <Steps stagger={0.08}>
            {[
              {
                n: "01",
                t: "Search or post",
                b: "Pick your route and time. Leave now, or schedule for Friday.",
              },
              {
                n: "02",
                t: "Chat, then pay",
                b: "Message the driver first. Agree pickup. Pay by M-Pesa inside the app.",
              },
              {
                n: "03",
                t: "Ride and rate",
                b: "Track the trip live. Money releases to the driver when you arrive.",
              },
            ].map((s) => (
              <StepCard key={s.n}>
                <StepNum>{s.n}</StepNum>
                <H3>{s.t}</H3>
                <p>{s.b}</p>
              </StepCard>
            ))}
          </Steps>
        </HowStack>
      </Section>

      {/* ── Ride requests ── */}
      <RidesSection id="rides">
        <RidesPattern aria-hidden />
        <RidesHead>
          <RidesHeadCol>
            <Eyebrow $tone="tan">Ride requests</Eyebrow>
            <H2>
              Seats going
              <br />
              your way.
            </H2>
          </RidesHeadCol>
          <Reveal delay={0.1}>
            <LinkOutline href="#download">See all rides</LinkOutline>
          </Reveal>
        </RidesHead>

        <RideTrack>
          {RIDES.map((r) => (
            <RideCard key={r.name} style={{ background: r.card }}>
              <RideTop>
                <RideWho>
                  <RideAvatar style={{ background: r.av, color: r.avText }}>
                    {r.initials}
                  </RideAvatar>
                  <RideName>
                    <b style={{ color: r.nameC }}>{r.name}</b>
                    <span style={{ color: r.subC }}>{r.sub}</span>
                  </RideName>
                </RideWho>
                <RideTag style={{ background: r.tagBg, color: r.tagC }}>
                  {r.tag}
                </RideTag>
              </RideTop>
              <RideRoute>
                <RideCity style={{ color: r.cityC }}>{r.from}</RideCity>
                <RideMeta style={{ color: r.metaC }}>{r.meta}</RideMeta>
                <RideCity style={{ color: r.cityC }}>{r.to}</RideCity>
              </RideRoute>
              <RideFoot>
                <RidePrice style={{ background: r.priceBg, color: r.priceC }}>
                  <PriceFlip>
                    <PricePrimary>{r.price}</PricePrimary>
                    <PriceCta aria-hidden>Get ride →</PriceCta>
                  </PriceFlip>
                </RidePrice>
                <RideWhen style={{ color: r.whenC }}>{r.when}</RideWhen>
              </RideFoot>
            </RideCard>
          ))}
        </RideTrack>
      </RidesSection>

      {/* ── Road alerts ── */}
      <Alerts id="alerts">
        <Wrap>
          <AlertsHead>
            <AlertsHeadCol>
              <LiveTag>
                <LiveTagDot />
                <span>Live</span>
              </LiveTag>
              <AlertsTitle>
                Road alerts,
                <br />
                as they happen.
              </AlertsTitle>
            </AlertsHeadCol>
            <Reveal delay={0.1}>
              <AlertsLead>
                Riders and drivers post what they&apos;re seeing on the road
                right now — accidents, weather, police checks, matatu jams.
                Nairobi, Mombasa, Kisumu, Nakuru, Eldoret. Verified by the
                people behind you.
              </AlertsLead>
            </Reveal>
          </AlertsHead>

          <AlertGrid stagger={0.08}>
            {ALERTS.map((a) => (
              <AlertCard key={a.handle}>
                <AlertHead>
                  <AlertAvatar style={{ background: a.avBg, color: a.avC }}>
                    {a.initials}
                  </AlertAvatar>
                  <AlertWho>
                    <AlertRow>
                      <AlertName>{a.name}</AlertName>
                      <AlertMeta>{a.handle}</AlertMeta>
                      <AlertMeta>{a.time}</AlertMeta>
                    </AlertRow>
                    <AlertRow>
                      <AlertChip $type={a.chip}>
                        {chipIcon[a.chip]}
                        {a.chipLabel}
                      </AlertChip>
                      <AlertLoc>{a.loc}</AlertLoc>
                    </AlertRow>
                  </AlertWho>
                </AlertHead>
                <AlertBody>{a.body}</AlertBody>
                <AlertEngage>
                  <span>
                    <CommentIcon />
                    {a.comments}
                  </span>
                  <span>
                    <HeartIcon />
                    {a.hearts}
                  </span>
                  <span>
                    <ViewsIcon />
                    {a.views}
                  </span>
                  <AlertShare aria-label="Share">
                    <ShareIcon />
                  </AlertShare>
                </AlertEngage>
              </AlertCard>
            ))}
          </AlertGrid>
        </Wrap>
      </Alerts>

      {/* ── Statistics ── */}
      <Stats>
        <StatsPeople amount={40}>
          <img
            src="/landing/people-right.png"
            alt=""
            style={{ width: "100%", display: "block" }}
          />
        </StatsPeople>
        <StatsWrap>
          <Reveal>
            <StatsTitle>
              Every empty seat is a road we didn&apos;t need.
            </StatsTitle>
          </Reveal>
          <StatsGrid stagger={0.07}>
            {STATS.map((s) => (
              <StatCard key={s.label} style={{ background: s.bg }}>
                <StatNum style={{ color: s.numC }}>
                  {s.prefix ? <StatUnit>{s.prefix}</StatUnit> : null}
                  <CountUp value={s.value} decimals={s.dec} />
                  {s.suffix ? <span>{s.suffix}</span> : null}
                </StatNum>
                <StatLabel style={{ color: s.labelC }}>{s.label}</StatLabel>
              </StatCard>
            ))}
          </StatsGrid>
        </StatsWrap>
      </Stats>

      {/* ── Download ── */}
      <Download id="download">
        <DownloadGrid>
          <DownloadCopy stagger={0.1}>
            <Eyebrow $tone="lime">In build · launching soon</Eyebrow>
            <H2>
              Put Kipita
              <br />
              in your pocket.
            </H2>
            <DownloadLead>
              We&apos;re finishing the app now. Join the waitlist and
              you&apos;ll get it the day it lands on the store — iOS and
              Android, same week.
            </DownloadLead>
            <StoreRow>
              <StoreBtn href="#contact" $variant="light">
                <AppleIcon size={24} fill="#14392A" />
                <StoreLabel>
                  <small>Coming to</small>
                  <b>App Store</b>
                </StoreLabel>
              </StoreBtn>
              <StoreBtn href="#contact" $variant="outline">
                <AndroidIcon size={24} />
                <StoreLabel>
                  <small>Coming to</small>
                  <b>Google Play</b>
                </StoreLabel>
              </StoreBtn>
            </StoreRow>
            <WaitlistForm />
          </DownloadCopy>

          <Reveal delay={0.1}>
            <Phones>
              <Phone
                src="/landing/app-search.png"
                alt="Kipita search screen"
                $pos="left"
              />
              <Phone
                src="/landing/app-home.png"
                alt="Kipita home screen"
                $pos="center"
              />
              <Phone
                src="/landing/app-rides.png"
                alt="Kipita rides screen"
                $pos="right"
              />
            </Phones>
          </Reveal>
        </DownloadGrid>
      </Download>

      {/* ── Contact ── */}
      <Contact id="contact">
        <ContactStack>
          <ContactHead>
            <Eyebrow $tone="tan">Support</Eyebrow>
            <H2>Someone&apos;s always on.</H2>
            <p>
              Report a driver, chase a refund, or just ask a question. Real
              people, Nairobi hours, and a bot that handles the rest overnight.
            </p>
          </ContactHead>

          <ContactDock />
        </ContactStack>
      </Contact>

      {/* ── Footer ── */}
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
                <FooterSocial href="#top" aria-label="Instagram">
                  <InstagramIcon size={20} fill="#9FE870" />
                </FooterSocial>
                <FooterSocial href="#top" aria-label="X">
                  <XIcon size={20} fill="#9FE870" />
                </FooterSocial>
                <FooterSocial href="#contact" aria-label="WhatsApp">
                  <WhatsappIcon size={20} fill="#9FE870" />
                </FooterSocial>
              </FooterSocials>
            </FooterBrand>

            <FooterCol>
              <FooterColTitle>
                <FooterTitleIcon>
                  <Compass />
                </FooterTitleIcon>
                Product
              </FooterColTitle>
              <FooterLink href="#rides">
                <span>Ride requests</span>
                <ArrowUpRight />
              </FooterLink>
              <FooterLink href="#alerts">
                <span>Road alerts</span>
                <ArrowUpRight />
              </FooterLink>
              <FooterLink href="#how">
                <span>How Kipita works</span>
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
    </Root>
  );
}
