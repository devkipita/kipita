import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Parallax } from "../../anim/Parallax";
import { Reveal } from "../../anim/Reveal";
import { RollingNumber } from "../../ui/Counter";
import { STATS } from "../data";

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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: clamp(16px, 2vw, 32px);
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: clamp(170px, 22vw, 210px);
  padding: clamp(24px, 3vw, 34px) clamp(20px, 3vw, 30px);
  border-radius: 26px;
  text-align: center;
`;

const StatNum = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 0.02em;
  width: 100%;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: clamp(30px, 3.8vw, 64px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  white-space: nowrap;
  min-width: 0;
  overflow: visible;

  @media (max-width: 900px) {
    font-size: clamp(28px, 5vw, 52px);
  }

  @media (max-width: 640px) {
    font-size: clamp(26px, 8vw, 42px);
  }
`;

const StatUnit = styled.span`
  font-size: 0.48em;
  flex: 0 0 auto;
  line-height: 1;
`;

const StatLabel = styled.span`
  max-width: 18ch;
  font-size: 15px;
  line-height: 1.35;
`;

export function StatsBand() {
  return (
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
                <RollingNumber
                  value={s.value}
                  decimals={s.dec}
                  ariaLabel={`${s.prefix ? `${s.prefix} ` : ""}${s.value}${s.suffix} ${s.label}`}
                />
                {s.suffix ? <span>{s.suffix}</span> : null}
              </StatNum>
              <StatLabel style={{ color: s.labelC }}>{s.label}</StatLabel>
            </StatCard>
          ))}
        </StatsGrid>
      </StatsWrap>
    </Stats>
  );
}
