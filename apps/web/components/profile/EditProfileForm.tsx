"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { ContentWidth } from "@/components/nav/AppShell";
import {
  Calendar,
  Confetti,
  Info,
  MapPin,
  User,
  Users,
} from "@/components/icons";
import { updateProfileAction, type ActionState } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/types";
import { nocturne } from "@/lib/nocturne";
import {
  BareInput,
  Choice,
  Choices,
  CommitAction,
  EditorRule,
  RULE,
} from "@/components/publish/controls";
import { ButtonOrb } from "@/components/ui/ButtonOrb";
import { DrawnCheck } from "@/components/ui/DrawnCheck";
import { DateOfBirthField } from "./DateOfBirthField";

const Wrap = styled(ContentWidth)`
  padding-block: 28px 64px;
`;

const Display = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(30px, 5.4vw, 48px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
  text-wrap: balance;
`;

const Lede = styled.p`
  margin: 14px 0 0;
  max-width: 48ch;
  font-size: 17px;
  line-height: 1.5;
  color: ${nocturne.muted};
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pop = keyframes`
  0% { transform: scale(0.5) rotate(-12deg); opacity: 0; }
  60% { transform: scale(1.12) rotate(4deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const Welcome = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 26px;
  padding: 20px 22px;
  border-radius: 16px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};
  font-size: 16.5px;
  font-weight: 600;
  line-height: 1.45;
  animation: ${rise} 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;

  .burst {
    display: grid;
    place-items: center;
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: color-mix(in oklab, var(--n-lime) 22%, transparent);
    color: ${nocturne.lime};
    animation: ${pop} 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
  }

  strong {
    color: ${nocturne.lime};
    font-weight: 800;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    .burst {
      animation: none;
    }
  }
`;

const Note = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 24px;
  padding: 16px 18px;
  border-radius: 14px;
  background: ${({ theme }) => theme.color.dangerBg};
  color: ${({ theme }) => theme.color.dangerText};
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;

  svg {
    flex: none;
  }
`;

const Fields = styled.div`
  display: grid;
  gap: 30px;
`;

const Field = styled.div`
  display: block;
  min-width: 0;
`;

const Legend = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  color: ${nocturne.muted};
  cursor: pointer;

  svg {
    display: block;
    flex: none;
    color: ${nocturne.accent};
  }
`;

const Group = styled.fieldset`
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
`;

const Commit = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 8px;

  @media (max-width: 560px) {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 20px;
  }
`;

const Skip = styled.a`
  font-size: 15px;
  font-weight: 600;
  color: ${nocturne.muted};
  text-decoration: none;
  box-shadow: inset 0 -2px 0 ${RULE};
  padding-bottom: 2px;
  transition:
    color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    color: ${nocturne.accent};
    box-shadow: inset 0 -3px 0 ${nocturne.accent};
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: 3px;
  }

  @media (max-width: 560px) {
    align-self: center;
  }
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

  useEffect(() => {
    if (state.ok) {
      router.push(welcome ? "/home" : "/profile");
      router.refresh();
    }
  }, [state.ok, welcome, router]);

  return (
    <Wrap $max={640}>
      <Display>
        {welcome ? "Complete your profile" : "Edit profile"}
      </Display>
      <Lede>
        This is what other Kipita members see when you book a seat or offer
        one. You can change it any time.
      </Lede>

      {welcome && (
        <Welcome>
          <span className="burst">
            <Confetti size={26} />
          </span>
          <span>
            <strong>You&apos;re in.</strong> Add a few details so riders know
            who they&apos;re travelling with.
          </span>
        </Welcome>
      )}

      {state.error && (
        <Note role="alert">
          <Info size={20} />
          {state.error}
        </Note>
      )}

      <EditorRule />

      <form action={action}>
        <Fields>
          <Field>
            <Legend htmlFor="profile-full-name">
              <User size={21} /> Full name
            </Legend>
            <BareInput
              id="profile-full-name"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Wanjiku Kamau"
              autoComplete="name"
            />
          </Field>

          <Field>
            <Legend htmlFor="profile-city">
              <MapPin size={21} /> City
            </Legend>
            <BareInput
              id="profile-city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Nairobi"
              autoComplete="address-level2"
            />
          </Field>

          <Group>
            <Legend as="legend">
              <Calendar size={21} /> Date of birth
            </Legend>
            <input type="hidden" name="date_of_birth" value={dob} />
            <DateOfBirthField value={dob} onChange={setDob} />
          </Group>

          <Group>
            <Legend as="legend">
              <Users size={21} /> Gender
            </Legend>
            <input type="hidden" name="gender" value={gender} />
            <Choices>
              {GENDERS.map((g) => (
                <Choice
                  key={g.value}
                  type="button"
                  $on={gender === g.value}
                  aria-pressed={gender === g.value}
                  onClick={() => setGender(gender === g.value ? "" : g.value)}
                >
                  {g.label}
                </Choice>
              ))}
            </Choices>
          </Group>

          <Commit>
            <CommitAction type="submit" disabled={pending}>
              {pending ? "Saving" : "Save changes"}
              {pending ? <ButtonOrb state="working" /> : <DrawnCheck size={21} />}
            </CommitAction>
            {welcome && <Skip href="/home">Skip for now</Skip>}
          </Commit>
        </Fields>
      </form>
    </Wrap>
  );
}
