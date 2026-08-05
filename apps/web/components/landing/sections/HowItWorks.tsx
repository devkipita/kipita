import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { Eyebrow, H2, Section, Wrap } from "../primitives";
import { RideSearch } from "../search/RideSearch";
import { StepFlow } from "./StepFlow";

const Stack = styled(Wrap)`
  display: flex;
  flex-direction: column;
  gap: clamp(36px, 4.5vw, 56px);
`;

const Head = styled(Reveal)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
  max-width: 720px;
  margin: 0 auto;
`;

const Lead = styled.p`
  margin: 0;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: ${nocturne.muted};
`;

const SearchHolder = styled.div`
  display: flex;
  justify-content: center;
`;

/**
 * "How it works" — instead of explaining, we let visitors try it. A live search
 * against real Kipita trips shows exactly what the app does: pick a route, see
 * seats going your way (or request one if the road is still empty).
 */
export function HowItWorks() {
  return (
    <Section id="find">
      <Stack>
        <Head>
          <Eyebrow $tone="green">Find a ride</Eyebrow>
          <H2>See who&apos;s going your way.</H2>
          <Lead>
            Type where you&apos;re headed. Kipita shows real seats leaving soon —
            and if no one&apos;s on your route yet, you can request it and we&apos;ll
            match you with a driver.
          </Lead>
        </Head>

        <SearchHolder>
          <RideSearch />
        </SearchHolder>

        <Reveal>
          <StepFlow />
        </Reveal>
      </Stack>
    </Section>
  );
}
