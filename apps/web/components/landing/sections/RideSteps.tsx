import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { StepArt } from "../StepArt";
import { RIDE_STEPS } from "../data";

const TONES = ["plain", "soft", "solid"] as const;

const Section = styled.section`
  background: ${nocturne.surface};
  padding: 105px max(34px, calc((100% - 1212px) / 2));

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

const Sub = styled.p`
  max-width: 390px;
  margin: 0 0 3px;
  line-height: 1.7;
  color: ${nocturne.muted};

  @media (max-width: 640px) {
    margin-top: 15px;
  }
`;

const Grid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

type Tone = "plain" | "soft" | "solid";

const TONE_BG: Record<Tone, string> = {
  plain: nocturne.bg,
  soft: nocturne.surface2,
  solid: nocturne.green,
};

const Step = styled.article<{ $tone: Tone }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 26px;
  min-height: 300px;
  padding: 30px 32px 32px;
  border-radius: 24px;
  background: ${({ $tone }) => TONE_BG[$tone]};
  color: ${({ $tone }) =>
    $tone === "solid" ? nocturne.onGreen : nocturne.cream};

  @media (max-width: 640px) {
    gap: 20px;
    min-height: 0;
    padding: 24px 25px 26px;
    border-radius: 20px;
  }
`;

/** The diagram is the card's subject, so it gets the top half, not a corner. */
const Art = styled.div`
  svg {
    display: block;
    width: 100%;
    max-width: 230px;
    height: auto;
  }
`;

const Foot = styled.div`
  margin-top: auto;
`;

const StepNo = styled.span<{ $tone: Tone }>`
  display: block;
  margin-bottom: 9px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.13em;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone }) => ($tone === "solid" ? nocturne.lime : nocturne.accent)};
`;

const StepTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 22px;
  color: inherit;
`;

const StepBody = styled.p<{ $tone: Tone }>`
  max-width: 290px;
  margin: 0;
  line-height: 1.65;
  color: ${({ $tone }) =>
    $tone === "solid" ? nocturne.onGreenMuted : nocturne.muted};
`;

export function RideSteps() {
  return (
    <Section id="how">
      <Head>
        <div>
          <Overline>Simple by design</Overline>
          <Title>Your next ride in three steps</Title>
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
                  ink={tone === "solid" ? nocturne.onGreen : nocturne.cream}
                  mark={tone === "solid" ? nocturne.lime : nocturne.accent}
                />
              </Art>
              <Foot>
                <StepNo $tone={tone}>{step.number}</StepNo>
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
