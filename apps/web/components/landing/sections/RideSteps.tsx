import styled from "styled-components";
import { Car, Check, MapPin } from "@/components/icons";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { RIDE_STEPS, type RideStep } from "../data";

const ICONS = { pin: MapPin, car: Car, check: Check } as const;

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
  overflow: hidden;
  min-height: 270px;
  padding: 32px;
  border-radius: 24px;
  background: ${({ $tone }) => TONE_BG[$tone]};
  color: ${({ $tone }) =>
    $tone === "solid" ? nocturne.onGreen : nocturne.cream};

  @media (max-width: 960px) {
    min-height: 210px;
  }
  @media (max-width: 640px) {
    padding: 25px;
    border-radius: 20px;
  }
`;

const Number = styled.span<{ $tone: Tone }>`
  position: absolute;
  right: 20px;
  top: 8px;
  font-size: 72px;
  font-weight: 800;
  color: ${({ $tone }) =>
    $tone === "solid" ? nocturne.onGreen : nocturne.accent};
  opacity: ${({ $tone }) => ($tone === "solid" ? 0.12 : 0.09)};
`;

const IconBox = styled.div<{ $tone: Tone }>`
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 48px;
  border-radius: 16px;
  background: ${({ $tone }) =>
    $tone === "solid" ? nocturne.lime : nocturne.surface};
  color: ${({ $tone }) =>
    $tone === "solid" ? nocturne.greenDeep : nocturne.accent};
  box-shadow: ${nocturne.cardShadow};

  @media (max-width: 960px) {
    margin-bottom: 25px;
  }
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

function StepIcon({ icon }: { icon: RideStep["icon"] }) {
  const Glyph = ICONS[icon];
  return <Glyph size={26} />;
}

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
              <Number $tone={tone} aria-hidden>
                {step.number}
              </Number>
              <IconBox $tone={tone}>
                <StepIcon icon={step.icon} />
              </IconBox>
              <StepTitle>{step.title}</StepTitle>
              <StepBody $tone={tone}>{step.body}</StepBody>
            </Step>
          );
        })}
      </Grid>
    </Section>
  );
}
