"use client";

import Image from "next/image";
import styled from "styled-components";
import people from "../../public/landing/people-left.png";
import { ContentWidth } from "@/components/nav/AppShell";
import { Busy, Shimmer, SrOnly } from "@/components/ui/Shimmer";
import { nocturne } from "@/lib/nocturne";

const Bone = styled(Shimmer)`
  background: ${nocturne.line};
`;

const ProfileWrap = styled(ContentWidth)`
  padding-block: 24px 40px;
`;

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 0 26px;

  .copy {
    flex: 1;
    display: grid;
    gap: 12px;
  }
  .pills {
    display: flex;
    gap: 8px;
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
`;

const Stat = styled.div`
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
`;

const Title = styled.div`
  margin: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.xs}
    ${({ theme }) => theme.space.sm};
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const PanelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 60px;
  padding: 14px 20px;
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .body {
    flex: 1;
    display: grid;
    gap: 6px;
  }
`;

function SkeletonPanel({ rows }: { rows: number }) {
  return (
    <Panel>
      {Array.from({ length: rows }, (_, i) => (
        <PanelRow key={i}>
          <Shimmer $w="40px" $h="40px" $r="10px" />
          <span className="body">
            <Shimmer $w="28%" $h="12px" />
            <Shimmer $w="52%" $h="15px" />
          </span>
        </PanelRow>
      ))}
    </Panel>
  );
}

export function ProfileSkeleton() {
  return (
    <Busy>
      <ProfileWrap $max={900}>
        <SrOnly>Loading your profile</SrOnly>
        <div aria-hidden>
          <Hero>
            <Bone $w="84px" $h="84px" $r="50%" />
            <div className="copy">
              <Bone $w="min(260px, 70%)" $h="28px" $r="10px" />
              <div className="pills">
                <Bone $w="86px" $h="26px" $r="999px" />
                <Bone $w="70px" $h="26px" $r="999px" />
              </div>
            </div>
          </Hero>
          <Stats>
            <Stat>
              <Shimmer $w="64px" $h="28px" />
              <Shimmer $w="48px" $h="14px" />
            </Stat>
            <Stat>
              <Shimmer $w="40px" $h="28px" />
              <Shimmer $w="40px" $h="14px" />
            </Stat>
          </Stats>
          <Title>
            <Bone $w="72px" $h="14px" />
          </Title>
          <SkeletonPanel rows={5} />
          <Title>
            <Bone $w="84px" $h="14px" />
          </Title>
          <SkeletonPanel rows={1} />
        </div>
      </ProfileWrap>
    </Busy>
  );
}

const EditWrap = styled(ContentWidth)`
  padding-block: 28px 56px;
`;

const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1fr);
  align-items: start;
  gap: 56px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const Display = styled.h1`
  margin: 0;
  font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
  font-size: clamp(30px, 5.4vw, 48px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: ${nocturne.cream};
`;

const Lede = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 18px;
  max-width: 48ch;
`;

const Art = styled.div`
  margin-top: 40px;
  max-width: 300px;

  img {
    display: block;
    width: 100%;
    height: auto;
  }

  @media (max-width: 960px) {
    display: none;
  }
`;

const Fields = styled.div`
  display: grid;
  gap: 30px;
  padding-top: 26px;

  @media (max-width: 960px) {
    padding-top: 30px;
  }
`;

const FieldBlock = styled.div`
  display: grid;
  gap: 12px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export function EditProfileSkeleton() {
  return (
    <Busy>
      <EditWrap $max={1120}>
        <SrOnly>Loading your profile</SrOnly>
        <Split>
          <div>
            <Display>Edit profile</Display>
            <Lede aria-hidden>
              <Bone $w="92%" $h="16px" />
              <Bone $w="64%" $h="16px" />
            </Lede>
            <Art aria-hidden>
              <Image src={people} alt="" sizes="300px" placeholder="blur" />
            </Art>
          </div>
          <Fields aria-hidden>
            {["38%", "26%"].map((w) => (
              <FieldBlock key={w}>
                <Bone $w={w} $h="15px" />
                <Bone $h="44px" $r="10px" />
              </FieldBlock>
            ))}
            <FieldBlock>
              <Bone $w="32%" $h="15px" />
              <Chips>
                <Bone $w="96px" $h="48px" $r="999px" />
                <Bone $w="120px" $h="48px" $r="999px" />
                <Bone $w="84px" $h="48px" $r="999px" />
              </Chips>
            </FieldBlock>
            <FieldBlock>
              <Bone $w="22%" $h="15px" />
              <Chips>
                <Bone $w="80px" $h="48px" $r="999px" />
                <Bone $w="96px" $h="48px" $r="999px" />
                <Bone $w="76px" $h="48px" $r="999px" />
                <Bone $w="150px" $h="48px" $r="999px" />
              </Chips>
            </FieldBlock>
            <Bone $w="190px" $h="56px" $r="999px" />
          </Fields>
        </Split>
      </EditWrap>
    </Busy>
  );
}
