import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { Eyebrow, H2 } from "../primitives";
import { RidesCarousel } from "../RidesCarousel";
import { RIDES } from "../data";

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

export function RideRequests() {
  return (
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

      <RidesCarousel>
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
      </RidesCarousel>
    </RidesSection>
  );
}
