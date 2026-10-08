import styled from "styled-components";
import Image from "next/image";
import poster from "../../../public/home/nairobi-hero.jpg";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { TrickleHeading } from "../TrickleHeading";
import { HeroSearchBar } from "../search/HeroSearchBar";

const HeroShell = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 770px;
  background: ${nocturne.greenDeep};
  color: #ffffff;

  @media (max-width: 960px) {
    min-height: 810px;
  }
  @media (max-width: 640px) {
    min-height: 75dvh;
  }
`;

const Photo = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;

  img {
    object-fit: cover;
    object-position: center 48%;
  }

  @media (max-width: 640px) {
    img {
      object-position: 61% center;
    }
  }
`;

const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(7, 39, 29, 0.92) 0%,
      rgba(10, 48, 36, 0.74) 45%,
      rgba(10, 45, 34, 0.24) 80%
    ),
    linear-gradient(0deg, rgba(4, 33, 24, 0.55), transparent 48%);

  @media (max-width: 640px) {
    background: linear-gradient(
      180deg,
      rgba(8, 41, 31, 0.72),
      rgba(8, 42, 31, 0.84) 54%,
      rgba(8, 42, 31, 0.98)
    );
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 770px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 170px 34px 62px;

  @media (max-width: 960px) {
    min-height: 810px;
    padding: 145px 24px 45px;
  }
  @media (max-width: 640px) {
    justify-content: flex-start;
    padding: 112px 18px calc(84px + env(safe-area-inset-bottom));
  }
`;

const Copy = styled.div`
  max-width: 730px;
`;

const Kicker = styled.div`
  display: inline-block;
  margin-bottom: 18px;
  color: ${nocturne.lime};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;

  @media (max-width: 640px) {
    font-size: 12px;
  }
`;

const Display = styled(TrickleHeading)`
  margin: 0;
  max-width: 850px;
  font-weight: 700;
  font-size: clamp(54px, 6.4vw, 92px);
  line-height: 0.98;
  letter-spacing: -0.035em;
  color: #ffffff;

  & .line-2 {
    display: block;
    color: ${nocturne.sage};
  }

  /* The masks clip each word's rise; a little lead-out keeps descenders whole. */
  & .tk-mask {
    margin-bottom: -0.06em;
  }

  @media (max-width: 960px) {
    font-size: clamp(48px, 10vw, 72px);
  }
  @media (max-width: 640px) {
    font-size: clamp(30px, 8.6vw, 48px);
  }
`;

const Lead = styled.p`
  max-width: 550px;
  margin: 24px 0 36px;
  font-size: 20px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.82);

  @media (max-width: 640px) {
    margin: 18px 0 25px;
    font-size: 16px;
  }
`;

export function Hero() {
  return (
    <HeroShell id="top">
      <Photo aria-hidden>
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={70}
          placeholder="blur"
        />
      </Photo>
      <Scrim aria-hidden />
      <Content>
        <Copy>
          <Kicker>Kenya moves better together</Kicker>

          <Display
            parts={[
              { text: "Go further." },
              { text: "Share the journey.", className: "line-2" },
            ]}
          />

          <Reveal stagger={0.12} delay={0.55}>
            <Lead>
              Affordable, trusted rides across Kenya with people already heading
              your way.
            </Lead>
          </Reveal>
        </Copy>

        <HeroSearchBar />
      </Content>
    </HeroShell>
  );
}
