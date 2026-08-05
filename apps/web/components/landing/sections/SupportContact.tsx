import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { Eyebrow, H2 } from "../primitives";
import { ContactDock } from "../ContactDock";

const Contact = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: ${nocturne.bg};

  @media (max-width: 640px) {
    padding-left: 12px;
    padding-right: 12px;
  }
`;

const ContactStack = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 44px;
`;

const ContactHead = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 760px;

  p {
    margin: 0;
    font-size: clamp(16px, 1.25vw, 20px);
    line-height: 1.6;
    color: ${nocturne.muted2};
  }
`;

export function SupportContact() {
  return (
    <Contact id="contact">
      <ContactStack>
        <ContactHead>
          <Eyebrow $tone="tan">Support</Eyebrow>
          <H2>Someone&apos;s always on.</H2>
          <p>
            Report a driver, chase a refund, or just ask a question. Real
            people, Nairobi hours, and a bot that handles the rest overnight.
          </p>
        </ContactHead>

        <ContactDock />
      </ContactStack>
    </Contact>
  );
}
