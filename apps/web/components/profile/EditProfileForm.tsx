"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  CalendarDays,
  Check,
  Info,
  MapPin,
  PartyPopper,
  UserRound,
} from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { updateProfileAction, type ActionState } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { TextField } from "@/components/auth/TextField";
import {
  AlertBox,
  ControlShell,
  Heading,
  Label,
  PrimaryButton,
  Spinner,
  Sub,
} from "@/components/auth/ui";

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.bg};
`;

const Wrap = styled.main`
  max-width: 560px;
  margin: 0 auto;
  padding: 8px clamp(18px, 4vw, 28px) 64px;
`;

const Welcome = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  margin-bottom: 24px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.primaryContainer};
  color: ${({ theme }) => theme.color.onPrimaryContainer};
  font-weight: 600;
  line-height: 1.4;
  svg { flex: none; }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $on: boolean }>`
  padding: 11px 16px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  border: 1.5px solid ${({ theme, $on }) => ($on ? theme.color.primary : theme.color.line)};
  background: ${({ theme, $on }) => ($on ? theme.color.primaryContainer : "transparent")};
  color: ${({ theme, $on }) => ($on ? theme.color.onPrimaryContainer : theme.color.text)};
  transition: all 0.18s ease;
  &:hover { border-color: ${({ theme }) => theme.color.primary}; }
`;

const Group = styled.div`
  display: grid;
  gap: 18px;
`;

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export function EditProfileForm({
  profile,
  welcome,
}: {
  profile: Profile;
  welcome?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    {},
  );

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [dob, setDob] = useState(profile.date_of_birth ?? "");
  const [gender, setGender] = useState<string>(profile.gender ?? "");
  const [dateFocus, setDateFocus] = useState(false);

  useEffect(() => {
    if (state.ok) {
      router.push("/profile");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <Page>
      <AppHeader name={profile.full_name} avatarUrl={profile.avatar_url} />
      <Wrap>
        {welcome && (
          <Welcome>
            <PartyPopper size={22} strokeWidth={2.2} />
            You&apos;re in! Add a few details so riders know who they&apos;re travelling with.
          </Welcome>
        )}

        <Heading style={{ fontSize: "1.9rem" }}>
          {welcome ? "Complete your profile" : "Edit profile"}
        </Heading>
        <Sub>This is what other Kipita members see. You can change it any time.</Sub>

        {state.error && (
          <AlertBox style={{ marginBottom: 18 }}>
            <Info size={18} />
            {state.error}
          </AlertBox>
        )}

        <form action={action}>
          <Group>
            <TextField
              label="Full name"
              icon={UserRound}
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Wanjiku Kamau"
            />
            <TextField
              label="City"
              icon={MapPin}
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Nairobi"
            />

            <div>
              <Label>
                <CalendarDays size={16} strokeWidth={2.2} /> Date of birth
              </Label>
              <ControlShell $focused={dateFocus}>
                <input
                  type="date"
                  name="date_of_birth"
                  value={dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDob(e.target.value)}
                  onFocus={() => setDateFocus(true)}
                  onBlur={() => setDateFocus(false)}
                />
              </ControlShell>
            </div>

            <div>
              <Label>
                <UserRound size={16} strokeWidth={2.2} /> Gender
              </Label>
              <input type="hidden" name="gender" value={gender} />
              <Chips>
                {GENDERS.map((g) => (
                  <Chip
                    key={g.value}
                    type="button"
                    $on={gender === g.value}
                    onClick={() => setGender(gender === g.value ? "" : g.value)}
                  >
                    {g.label}
                  </Chip>
                ))}
              </Chips>
            </div>

            <PrimaryButton type="submit" disabled={pending}>
              {pending ? <Spinner /> : <>Save changes <Check size={19} strokeWidth={2.6} /></>}
            </PrimaryButton>
          </Group>
        </form>
      </Wrap>
    </Page>
  );
}
