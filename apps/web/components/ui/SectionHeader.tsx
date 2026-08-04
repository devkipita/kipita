import styled from "styled-components";
import { AnimatedHeading } from "@/components/anim/AnimatedHeading";
import { Reveal } from "@/components/anim/Reveal";
import { Eyebrow, Lead } from "./primitives";

const Head = styled.div<{ $center?: boolean }>`
  max-width: 760px;
  ${({ $center }) =>
    $center &&
    `margin-left: auto; margin-right: auto; text-align: center;`}

  ${Eyebrow} {
    margin-bottom: 16px;
  }
  ${Lead} {
    margin-top: 8px;
  }
`;

const Heading = styled(AnimatedHeading)`
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
  font-weight: 800;
  margin: 0 0 16px;
`;

/** Eyebrow + animated heading + lead — the repeating section intro. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  center = false,
  maxTitle,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  center?: boolean;
  maxTitle?: string;
}) {
  return (
    <Head $center={center}>
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Heading text={title} style={maxTitle ? { maxWidth: maxTitle } : undefined} />
      {lead && (
        <Reveal>
          <Lead>{lead}</Lead>
        </Reveal>
      )}
    </Head>
  );
}
