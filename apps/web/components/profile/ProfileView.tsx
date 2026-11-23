"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import styled, { keyframes } from "styled-components";
import { ContentWidth, useAppMode } from "@/components/nav/AppShell";
import { SealCheck as BadgeCheck, Bell, CalendarBlank as CalendarDays, Car, CircleNotch, Cookie, FileText, Gift, Question as HelpCircle, Info, QuestionCircle, SignOut as LogOut, Envelope as Mail, MapPin, Moon, Pencil, Phone, Receipt as ReceiptText, Shield, Star, UserCircle as UserRound, Wallet } from "@/components/icons";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { ToneName } from "@/lib/theme";
import { Switch } from "@/components/ui/Switch";
import { useThemeMode } from "@/components/providers/ThemeRuntimeProvider";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { AvatarUploader } from "./AvatarUploader";
import { NotificationsCard } from "./NotificationsCard";
import { ControlRow, LinkRow, Panel, SectionTitle } from "./SettingsUI";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { PhoneCard } from "./PhoneCard";
import { DriverSection } from "./DriverSection";
import type { GarageCar } from "@/lib/home/vehicle";
import { SITE } from "@/lib/site";

const Wrap = styled(ContentWidth)`
  padding-block: 24px 40px;
`;

const Hero = styled.section`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 0 26px;

  > div:last-child {
    flex: 1;
    min-width: 0;
  }
`;

const Name = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
`;

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Pill = styled.span<{ $ok?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 999px;
  background: ${({ theme, $ok }) => ($ok ? theme.color.primaryContainer : theme.color.surface2)};
  color: ${({ theme, $ok }) => ($ok ? theme.color.onPrimaryContainer : theme.color.muted)};
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
`;

const Stat = styled.div<{ $tone: ToneName }>`
  background: ${({ theme, $tone }) => theme.tone[$tone].bg};
  color: ${({ theme, $tone }) => theme.tone[$tone].on};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 18px;

  b {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 1.5rem;
    font-weight: 800;
  }
  small {
    color: inherit;
    opacity: 0.72;
    font-size: 0.85rem;
    font-weight: 700;
  }
`;

const List = styled(Panel)`
  overflow: hidden;
`;

const SectionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin-right: 0;
  }
`;

const EditLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.color.outlineVariant};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurface};
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 700;
  transition:
    background ${dur.state} ${ease.standard},
    border-color ${dur.state} ${ease.standard},
    color ${dur.state} ${ease.standard};

  svg {
    flex: none;
  }

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.primary};
      border-color: ${({ theme }) => theme.color.primary};
      color: ${({ theme }) => theme.color.onPrimary};
    }
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 60px;
  padding: 14px 20px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  & + & {
    border-top: none;
  }
  svg.lead {
    color: ${({ theme }) => theme.color.primary};
    flex: none;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .k {
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.color.muted};
  }
  .v {
    font-size: 1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.color.text};
  }
  .v.empty {
    color: ${({ theme }) => theme.color.muted};
    font-weight: 500;
  }
`;

const NotificationsPanel = styled(Panel)`
  margin-bottom: 12px;
`;

const SignOutForm = styled.form`
  display: flex;
  margin-top: 30px;
`;

const spin = keyframes`to { transform: rotate(360deg); }`;

const SignOut = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  flex: 1;
  min-height: 52px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid color-mix(in oklab, ${nocturne.danger} 34%, transparent);
  background: color-mix(in oklab, ${nocturne.danger} 10%, transparent);
  color: ${nocturne.danger};
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    background ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  .spin {
    animation: ${spin} 0.9s linear infinite;
  }
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: color-mix(in oklab, ${nocturne.danger} 16%, transparent);
    }
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.danger};
    outline-offset: 3px;
  }
  &:disabled {
    cursor: progress;
  }
  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <SignOut type="submit" disabled={pending} aria-busy={pending}>
      {pending ? <CircleNotch className="spin" size={18} /> : <LogOut size={18} />}
      {pending ? "Signing out…" : "Sign out"}
    </SignOut>
  );
}

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export function ProfileView({
  profile,
  cars,
  carsError,
}: {
  profile: Profile;
  cars: GarageCar[];
  carsError: boolean;
}) {
  const { mode, toggle } = useThemeMode();
  const {
    mode: appMode,
    setMode: setAppMode,
    driverReady,
    requireKyc,
  } = useAppMode();
  const dob = profile.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Wrap $max={900}>
        <Hero>
          <AvatarUploader userId={profile.id} name={profile.full_name} src={profile.avatar_url} />
          <div>
            <Name>{profile.full_name || "Your profile"}</Name>
            <Pills>
              <Pill $ok={profile.is_verified}>
                <BadgeCheck size={13} />
                {profile.is_verified ? "Verified" : "Unverified"}
              </Pill>
              {profile.email_verified && (
                <Pill $ok>
                  <Mail size={13} /> Email
                </Pill>
              )}
              {profile.phone_verified && (
                <Pill $ok>
                  <Phone size={13} /> Phone
                </Pill>
              )}
            </Pills>
          </div>
        </Hero>

        <Stats>
          <Stat $tone="tan">
            <b>
              <Star size={20} weight="fill" />
              {profile.rating && profile.rating > 0 ? profile.rating.toFixed(1) : "New"}
            </b>
            <small>Rating</small>
          </Stat>
          <Stat $tone="mint">
            <b>{profile.total_trips ?? 0}</b>
            <small>Trips</small>
          </Stat>
        </Stats>

        <SectionBar>
          <SectionTitle>Details</SectionTitle>
          <EditLink href="/profile/edit">
            <Pencil size={16} />
            Edit profile
          </EditLink>
        </SectionBar>
        <List>
          <Row>
            <Mail className="lead" size={20} />
            <div className="body">
              <div className="k">Email</div>
              <div className={`v ${profile.email ? "" : "empty"}`}>{profile.email ?? "Not set"}</div>
            </div>
          </Row>
          <Row>
            <Phone className="lead" size={20} />
            <div className="body">
              <div className="k">Phone</div>
              <div className={`v ${profile.phone ? "" : "empty"}`}>
                {profile.phone ? `+${profile.phone.replace(/^\+/, "")}` : "Not set"}
                {profile.phone && !profile.phone_verified ? " (not verified)" : ""}
              </div>
            </div>
          </Row>
          <Row>
            <MapPin className="lead" size={20} />
            <div className="body">
              <div className="k">City</div>
              <div className={`v ${profile.city ? "" : "empty"}`}>{profile.city ?? "Not set"}</div>
            </div>
          </Row>
          <Row>
            <CalendarDays className="lead" size={20} />
            <div className="body">
              <div className="k">Birthday</div>
              <div className={`v ${dob ? "" : "empty"}`}>{dob ?? "Not set"}</div>
            </div>
          </Row>
          <Row>
            <UserRound className="lead" size={20} />
            <div className="body">
              <div className="k">Gender</div>
              <div className={`v ${profile.gender ? "" : "empty"}`}>
                {profile.gender ? GENDER_LABEL[profile.gender] : "Not set"}
              </div>
            </div>
          </Row>
        </List>

        <SectionTitle>Security</SectionTitle>
        <Panel>
          <PhoneCard
            phone={profile.phone}
            verified={profile.phone_verified}
            via={profile.phone_verified_via}
          />
          <ChangePasswordCard email={profile.email} />
        </Panel>

        <SectionTitle>Money</SectionTitle>
        <Panel>
          <LinkRow
            icon={Wallet}
            title="Wallet"
            description="Balance, escrow and payouts"
            href="/wallet"
            tone="green"
          />
          <LinkRow
            icon={Gift}
            title="Invite friends"
            description="Share your code and earn credit"
            href="/referrals"
            tone="lime"
            last
          />
        </Panel>

        <SectionTitle>How you use Kipita</SectionTitle>
        <Panel>
          <ControlRow
            icon={Car}
            title="Driver mode"
            description={
              appMode === "driver"
                ? "You are offering rides"
                : "Switch to offer seats instead of booking them"
            }
            tone="green"
            last
          >
            <Switch
              checked={appMode === "driver"}
              onChange={() => {
                if (appMode === "driver") {
                  setAppMode("passenger");
                  return;
                }
                if (!driverReady) {
                  requireKyc();
                  return;
                }
                setAppMode("driver");
              }}
              label="Driver mode"
            />
          </ControlRow>
        </Panel>

        <DriverSection cars={cars} carsError={carsError} />

        <SectionTitle>Appearance</SectionTitle>
        <Panel>
          <ControlRow icon={Moon} title="Dark mode" description="Easier on the eyes at night" tone="blue" last>
            <Switch checked={mode === "dark"} onChange={toggle} label="Dark mode" />
          </ControlRow>
        </Panel>

        <SectionTitle>Notifications</SectionTitle>
        <NotificationsPanel>
          <LinkRow
            icon={Bell}
            title="Your notifications"
            description="New rides, requests and trip updates"
            href="/notifications"
            tone="blue"
            last
          />
        </NotificationsPanel>
        <NotificationsCard />

        <SectionTitle>Help &amp; support</SectionTitle>
        <Panel>
          <LinkRow icon={HelpCircle} title="Help & FAQ" description="Answers to common questions" href="/help" tone="mint" />
          <LinkRow icon={Info} title="How to use Kipita" description="A quick tour of the basics" href="/help#start" tone="green" />
          <LinkRow icon={QuestionCircle} title="Contact support" description="We're here to help" href={`mailto:${SITE.supportEmail}`} external tone="amber" last />
        </Panel>

        <SectionTitle>Legal</SectionTitle>
        <Panel>
          <LinkRow icon={Info} title="Privacy and terms" description="Everything in one place" href="/legal" tone="mint" />
          <LinkRow icon={Shield} title="Privacy policy" href="/legal/privacy" tone="blue" />
          <LinkRow icon={FileText} title="Terms of service" href="/legal/terms" tone="green" />
          <LinkRow icon={Cookie} title="Cookie policy" href="/legal/cookies" tone="tan" />
          <LinkRow icon={ReceiptText} title="Refund policy" href="/legal/refunds" tone="amber" last />
        </Panel>

        <SignOutForm action={signOutAction}>
          <SignOutButton />
        </SignOutForm>
      </Wrap>
    </>
  );
}

