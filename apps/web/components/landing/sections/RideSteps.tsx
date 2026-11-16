import styled, { css } from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { StepArt } from "../StepArt";
import { RIDE_STEPS } from "../data";

type Tone = "plain" | "soft" | "solid";

const TONES: readonly Tone[] = ["plain", "soft", "solid"];

const HEADING = `var(--font-manrope), "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`;

const TONE_BG: Record<Tone, string> = {
  plain: nocturne.bg,
  soft: nocturne.surface2,
  solid: nocturne.green,
};

const TONE_INK: Record<Tone, string> = {
  plain: nocturne.cream,
  soft: nocturne.cream,
  solid: nocturne.onGreen,
};

const TONE_MUTED: Record<Tone, string> = {
  plain: nocturne.muted,
  soft: nocturne.muted,
  solid: nocturne.onGreenMuted,
};

const TONE_MARK: Record<Tone, string> = {
  plain: nocturne.accent,
  soft: nocturne.accent,
  solid: nocturne.lime,
};

const Section = styled.section`
  background: ${nocturne.surface};
  padding-block: clamp(72px, 9vw, 120px);
  padding-inline: max(20px, calc((100% - 1212px) / 2));
`;

const Head = styled(Reveal)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
  align-items: end;
  column-gap: clamp(32px, 6vw, 96px);
  row-gap: 16px;
  margin-bottom: clamp(32px, 4.5vw, 56px);

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Overline = styled.p`
  margin: 0 0 14px;
  color: ${nocturne.ctaBg};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${HEADING};
  font-size: clamp(2.25rem, 1.35rem + 3.4vw, 3.625rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: ${nocturne.cream};
  text-wrap: balance;
`;

const Sub = styled.p`
  max-width: 36ch;
  margin: 0;
  padding-bottom: 0.4em;
  font-size: clamp(1rem, 0.96rem + 0.2vw, 1.0625rem);
  line-height: 1.6;
  color: ${nocturne.muted};
  text-wrap: pretty;

  @media (max-width: 860px) {
    padding-bottom: 0;
  }
`;

const Grid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 1.5vw, 20px);

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Step = styled.article<{ $tone: Tone }>`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: clamp(20px, 2.4vw, 32px);
  padding: clamp(20px, 2.2vw, 28px);
  border-radius: 24px;
  background: ${({ $tone }) => TONE_BG[$tone]};
  color: ${({ $tone }) => TONE_INK[$tone]};

  ${({ $tone }) =>
    $tone !== "solid" &&
    css`
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, ${nocturne.cream} 6%, transparent);
    `}

  @media (min-width: 641px) and (max-width: 960px) {
    grid-template-rows: none;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
    gap: clamp(24px, 4vw, 40px);
  }

  @media (max-width: 640px) {
    border-radius: 20px;
  }
`;

const Art = styled.div`
  display: grid;
  place-items: center;
  aspect-ratio: 212 / 120;
  width: 100%;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (max-width: 640px) {
    max-width: 420px;
    margin-inline: auto;
  }
`;

const Foot = styled.div`
  align-self: end;
  padding-inline: 4px;

  @media (min-width: 641px) and (max-width: 960px) {
    align-self: center;
  }
`;

const StepNo = styled.span<{ $tone: Tone }>`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: clamp(14px, 1.6vw, 20px);
  font-family: ${HEADING};
  font-size: clamp(2.75rem, 2.1rem + 2vw, 3.75rem);
  font-weight: 300;
  line-height: 0.85;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums lining-nums;
  color: ${({ $tone }) => TONE_MARK[$tone]};

  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: currentColor;
    opacity: 0.22;
  }
`;

const StepTitle = styled.h3`
  margin: 0 0 8px;
  font-family: ${HEADING};
  font-size: clamp(1.25rem, 1.1rem + 0.45vw, 1.5rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: inherit;
  text-wrap: balance;
`;

const StepBody = styled.p<{ $tone: Tone }>`
  max-width: 34ch;
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: ${({ $tone }) => TONE_MUTED[$tone]};
  text-wrap: pretty;
`;

export function RideSteps() {
  return (
    <Section id="how" aria-labelledby="how-title">
      <Head>
        <div>
          <Overline>Simple by design</Overline>
          <Title id="how-title">Your next ride in three steps</Title>
        </div>
        <Sub>
          No complicated booking. Just choose where you&apos;re going and meet
          your verified driver.
        </Sub>
      </Head>

      <Grid stagger={0.08}>
        {RIDE_STEPS.map((step, i) => {
          const tone = TONES[i] ?? "plain";
          return (
            <Step key={step.number} $tone={tone}>
              <Art>
                <StepArt
                  icon={step.icon}
                  ink={TONE_INK[tone]}
                  mark={TONE_MARK[tone]}
                  bg={TONE_BG[tone]}
                />
              </Art>
              <Foot>
                <StepNo $tone={tone} aria-hidden>
                  {String(step.number).padStart(2, "0")}
                </StepNo>
                <StepTitle>{step.title}</StepTitle>
                <StepBody $tone={tone}>{step.body}</StepBody>
              </Foot>
            </Step>
          );
        })}
      </Grid>
    </Section>
  );
}
