import styled from "styled-components";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "@/components/icons";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { routeCardImage } from "../imageSpecs";
import type { RouteCard } from "@/lib/landing.server";

const Section = styled.section`
  background: ${nocturne.bg};
  padding: 105px max(34px, calc((100% - 1212px) / 2)) 120px;

  @media (max-width: 640px) {
    padding: 72px 18px;
  }
`;

const Head = styled(Reveal)`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 46px;

  @media (max-width: 640px) {
    display: block;
    margin-bottom: 30px;
  }
`;

const Overline = styled.span`
  display: inline-block;
  color: ${nocturne.ctaBg};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  max-width: 730px;
  margin: 10px 0 0;
  font-size: clamp(38px, 4vw, 58px);
  line-height: 1.07;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};

  @media (max-width: 640px) {
    font-size: 36px;
  }
`;

const SeeAll = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  color: ${nocturne.accent};
  font-weight: 700;

  &:hover {
    text-decoration: underline;
  }

  @media (max-width: 640px) {
    margin-top: 15px;
  }
`;

const Grid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(Link)`
  display: block;
  overflow: hidden;
  border-radius: 24px;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.cardShadow};
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${nocturne.panelShadow};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const Art = styled.span`
  position: relative;
  display: block;
  height: 180px;
  overflow: hidden;
  background: ${nocturne.surface2};

  img {
    object-fit: cover;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 45%,
      rgba(7, 39, 29, 0.45) 100%
    );
  }

  @media (max-width: 640px) {
    height: 150px;
  }
`;

const Body = styled.span`
  display: block;
  padding: 22px;
`;

const Places = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 19px;
  font-weight: 700;
  color: ${nocturne.cream};

  svg {
    flex: none;
    color: ${nocturne.ctaBg};
  }
`;

const Meta = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${nocturne.accent};

  strong {
    font-weight: 700;
  }
  small {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${nocturne.muted2};
  }
`;

const Empty = styled.p`
  margin: 0;
  color: ${nocturne.muted};
`;

export function PopularRoutes({ routes }: { routes: RouteCard[] }) {
  return (
    <Section id="routes">
      <Head>
        <div>
          <Overline>Popular this week</Overline>
          <Title>Where Kenya is going</Title>
        </div>
        <SeeAll href="/home">
          Explore all routes <ArrowRight size={18} />
        </SeeAll>
      </Head>

      {routes.length ? (
        <Grid stagger={0.08}>
          {routes.map((r) => (
            <Card
              key={`${r.from}-${r.to}`}
              href={`/home?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`}
            >
              <Art aria-hidden>
                <Image {...routeCardImage(r.image)} />
              </Art>
              <Body>
                <Places>
                  <b>{r.from}</b>
                  <ArrowRight size={18} />
                  <b>{r.to}</b>
                </Places>
                <Meta>
                  <strong>{r.price}</strong>
                  <small>
                    <Clock size={15} />
                    {r.duration}
                  </small>
                </Meta>
              </Body>
            </Card>
          ))}
        </Grid>
      ) : (
        <Empty>No rides posted yet. Be the first to publish one.</Empty>
      )}
    </Section>
  );
}
