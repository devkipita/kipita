"use client";

import Link from "next/link";
import styled from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import { SealCheck as BadgeCheck, Bell, CalendarBlank as CalendarDays, Cookie, FileText, Question as HelpCircle, Info, Lifebuoy as LifeBuoy, SignOut as LogOut, Envelope as Mail, MapPin, Moon, Pencil, Phone, Receipt as ReceiptText, Shield, Star, UserCircle as UserRound, Wallet } from "@/components/icons";
import type { ToneName } from "@/lib/theme";
import { Switch } from "@/components/ui/Switch";
import { useThemeMode } from "@/components/providers/ThemeRuntimeProvider";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { AvatarUploader } from "./AvatarUploader";
import { NotificationsCard } from "./NotificationsCard";
import { ControlRow, LinkRow, Panel, SectionTitle } from "./SettingsUI";

const Wrap = styled(ContentWidth)`
  padding-block: 24px 40px;
`;

const Hero = styled.section`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 0 26px;
`;

const Name = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
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

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
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
    color: ${({ theme }) => theme.color.text};
  }
  .v.empty {
    color: ${({ theme }) => theme.color.muted};
    font-weight: 500;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 30px;
`;

const EditBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  flex: 1;
  min-width: 150px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.onPrimary};
  font-weight: 700;
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.color.line};
  transition: background 0.2s ease, transform 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.color.primaryDark};
    transform: translateY(-1px);
  }
`;

/* Deep red field, vivid red ink — an unmistakable danger action. */
const SignOut = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  flex: 1;
  min-width: 150px;
  height: 52px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  background: #3d1210;
  color: #ff5a52;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  &:hover {
    background: #4d1815;
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(1px);
  }
`;

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export function ProfileView({ profile }: { profile: Profile }) {
  const { mode, toggle } = useThemeMode();
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
              {profile.rating?.toFixed(1) ?? "0.0"}
            </b>
            <small>Rating</small>
          </Stat>
          <Stat $tone="mint">
            <b>{profile.total_trips ?? 0}</b>
            <small>Trips</small>
          </Stat>
        </Stats>

        <SectionTitle>Details</SectionTitle>
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
              <div className={`v ${profile.phone ? "" : "empty"}`}>{profile.phone ?? "Not set"}</div>
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

        <SectionTitle>Money</SectionTitle>
        <Panel>
          <LinkRow
            icon={Wallet}
            title="Wallet"
            description="Balance, escrow and payouts"
            href="/wallet"
            tone="green"
            last
          />
        </Panel>

        <SectionTitle>Appearance</SectionTitle>
        <Panel>
          <ControlRow icon={Moon} title="Dark mode" description="Easier on the eyes at night" tone="blue" last>
            <Switch checked={mode === "dark"} onChange={toggle} label="Dark mode" />
          </ControlRow>
        </Panel>

        <SectionTitle>Notifications</SectionTitle>
        <Panel style={{ marginBottom: 12 }}>
          <LinkRow
            icon={Bell}
            title="Your notifications"
            description="New rides, requests and trip updates"
            href="/notifications"
            tone="blue"
            last
          />
        </Panel>
        <NotificationsCard />

        <SectionTitle>Help &amp; support</SectionTitle>
        <Panel>
          <LinkRow icon={HelpCircle} title="Help & FAQ" description="Answers to common questions" href="/help" tone="mint" />
          <LinkRow icon={Info} title="How to use Kipita" description="A quick tour of the basics" href="/help#start" tone="green" />
          <LinkRow icon={LifeBuoy} title="Contact support" description="We're here to help" href="mailto:support@kipita.app" external tone="amber" last />
        </Panel>

        <SectionTitle>Legal</SectionTitle>
        <Panel>
          <LinkRow icon={Shield} title="Privacy Policy" href="/legal/privacy" tone="blue" />
          <LinkRow icon={FileText} title="Terms of Service" href="/legal/terms" tone="green" />
          <LinkRow icon={Cookie} title="Cookie Policy" href="/legal/cookies" tone="tan" />
          <LinkRow icon={ReceiptText} title="Refund Policy" href="/legal/refunds" tone="amber" last />
        </Panel>

        <Actions>
          <EditBtn href="/profile/edit">
            <Pencil size={18} /> Edit profile
          </EditBtn>
          <form action={signOutAction} style={{ flex: 1, display: "flex" }}>
            <SignOut type="submit">
              <LogOut size={18} /> Sign out
            </SignOut>
          </form>
        </Actions>
      </Wrap>
    </>
  );
}
