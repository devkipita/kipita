import styled from "styled-components";
import { ArrowRight, ShieldCheck, Wallet } from "@/components/icons";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";

const DRIVER = "/landing/driver.jpg";

const Outer = styled.section`
  background: ${nocturne.bg};
  padding: 0 max(34px, calc((100% - 1212px) / 2)) 115px;

  @media (max-width: 640px) {
    padding: 0 18px 75px;
  }
`;

const Panel = styled(Reveal)`
  display: grid;
  grid-template-columns: 0.86fr 1.14fr;
  overflow: hidden;
  border-radius: 32px;
  background: ${nocturne.green};
  color: ${nocturne.onGreen};

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
  @media (max-width: 640px) {
    border-radius: 24px;
  }
`;

const Figure = styled.div`
  position: relative;
  min-height: 510px;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 960px) {
    min-height: 360px;
  }
  @media (max-width: 640px) {
    min-height: 290px;
  }
`;

const Badge = styled.span`
  position: absolute;
  left: 24px;
  bottom: 24px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 999px;
  background: ${nocturne.surface};
  color: ${nocturne.accent};
  font-size: 12px;
  font-weight: 700;

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #48a44b;
  }
`;

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 64px 70px;

  @media (max-width: 640px) {
    padding: 38px 25px;
  }
`;

const Overline = styled.span`
  display: inline-block;
  color: ${nocturne.lime};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  max-width: 730px;
  margin: 12px 0 22px;
  font-size: clamp(38px, 4vw, 58px);
  line-height: 1.07;
  letter-spacing: -0.035em;
  color: inherit;

  @media (max-width: 640px) {
    font-size: 36px;
  }
`;

const Lead = styled.p`
  max-width: 570px;
  margin: 0;
  line-height: 1.7;
  color: ${nocturne.onGreenMuted};
`;

const Benefits = styled.div`
  display: flex;
  gap: 25px;
  margin: 20px 0 32px;
  font-size: 15px;
  font-weight: 600;

  span {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const Publish = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 23px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-weight: 700;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

export function DriverCta() {
  return (
    <Outer id="drive">
      <Panel>
        <Figure>
          <img src={DRIVER} alt="A driver at the wheel, about to set off" />
          <Badge>Verified driver</Badge>
        </Figure>
        <Copy>
          <Overline>Going somewhere?</Overline>
          <Title>Your empty seat could cover your fuel.</Title>
          <Lead>
            Publish your trip in minutes, choose who rides with you, and get
            paid securely after the journey.
          </Lead>
          <Benefits>
            <span>
              <Wallet size={18} />
              Set your own price
            </span>
            <span>
              <ShieldCheck size={18} />
              You choose your passengers
            </span>
          </Benefits>
          <Publish href="#download">
            Publish a ride <ArrowRight size={18} />
          </Publish>
        </Copy>
      </Panel>
    </Outer>
  );
}
