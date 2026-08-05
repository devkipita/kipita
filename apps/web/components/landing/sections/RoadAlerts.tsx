import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { H2, PulseDot, Wrap } from "../primitives";
import { ALERTS } from "../data";
import {
  BusMini,
  WarningIcon,
  CloudIcon,
  CommentIcon,
  HeartIcon,
  ViewsIcon,
  ShareIcon,
} from "../icons";

const Alerts = styled.section`
  position: relative;
  padding: clamp(90px, 10vw, 150px) clamp(20px, 5vw, 72px);
  background: #edf2dc;

  @media (max-width: 640px) {
    padding-left: 8px;
    padding-right: 8px;
  }
`;

const AlertsHead = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 40px;
  align-items: end;
`;

const AlertsHeadCol = styled(Reveal)`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const LiveTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  align-self: flex-start;
  padding: 8px 16px;
  border-radius: 999px;
  background: ${nocturne.green};

  span:last-child {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${nocturne.cream};
  }
`;

const LiveTagDot = styled(PulseDot)`
  background: ${nocturne.cream};
  animation-duration: 1.6s;
`;

const AlertsTitle = styled(H2)`
  color: ${nocturne.greenDeep};
`;

const AlertsLead = styled.p`
  margin: 0;
  font-size: clamp(16px, 1.25vw, 20px);
  line-height: 1.6;
  color: #3f5a46;
  max-width: 520px;
`;

const AlertGrid = styled(Reveal)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px;
  margin-top: 48px;
`;

const AlertCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  border-radius: 24px;
  background: ${nocturne.surface2};
  border: 1px solid ${nocturne.line2};
`;

const AlertHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const AlertAvatar = styled.div`
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
`;

const AlertWho = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
`;

const AlertRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const AlertName = styled.span`
  font-family: var(--font-dm-sans), system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: ${nocturne.cream};
`;

const AlertMeta = styled.span`
  font-size: 14px;
  color: #7e857c;
`;

const AlertLoc = styled.span`
  font-size: 13px;
  color: #7e857c;
`;

const AlertChip = styled.span<{ $type: "traffic" | "accident" | "weather" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  ${({ $type }) =>
    $type === "traffic"
      ? `background: ${nocturne.tan}; color: #2e2416;`
      : $type === "accident"
        ? `background: #4a1518; color: #ff7d86; box-shadow: inset 0 0 0 1px rgba(255, 125, 134, 0.3);`
        : `background: ${nocturne.sage}; color: ${nocturne.greenDeep};`}
`;

const AlertBody = styled.p`
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: #c3c7c1;
`;

const AlertEngage = styled.div`
  display: flex;
  align-items: center;
  gap: 26px;
  padding-top: 12px;
  border-top: 1px solid ${nocturne.line2};
  margin-top: 2px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: #8e958c;
  }
`;

const AlertShare = styled.span`
  margin-left: auto;
  color: #6e7c66 !important;
`;

const chipIcon = {
  traffic: <BusMini size={12} />,
  accident: <WarningIcon size={12} />,
  weather: <CloudIcon size={12} />,
};

export function RoadAlerts() {
  return (
    <Alerts id="alerts">
      <Wrap>
        <AlertsHead>
          <AlertsHeadCol>
            <LiveTag>
              <LiveTagDot />
              <span>Live</span>
            </LiveTag>
            <AlertsTitle>
              Road alerts,
              <br />
              as they happen.
            </AlertsTitle>
          </AlertsHeadCol>
          <Reveal delay={0.1}>
            <AlertsLead>
              Riders and drivers post what they&apos;re seeing on the road right
              now — accidents, weather, police checks, matatu jams. Nairobi,
              Mombasa, Kisumu, Nakuru, Eldoret. Verified by the people behind
              you.
            </AlertsLead>
          </Reveal>
        </AlertsHead>

        <AlertGrid stagger={0.08}>
          {ALERTS.map((a) => (
            <AlertCard key={a.handle}>
              <AlertHead>
                <AlertAvatar style={{ background: a.avBg, color: a.avC }}>
                  {a.initials}
                </AlertAvatar>
                <AlertWho>
                  <AlertRow>
                    <AlertName>{a.name}</AlertName>
                    <AlertMeta>{a.handle}</AlertMeta>
                    <AlertMeta>{a.time}</AlertMeta>
                  </AlertRow>
                  <AlertRow>
                    <AlertChip $type={a.chip}>
                      {chipIcon[a.chip]}
                      {a.chipLabel}
                    </AlertChip>
                    <AlertLoc>{a.loc}</AlertLoc>
                  </AlertRow>
                </AlertWho>
              </AlertHead>
              <AlertBody>{a.body}</AlertBody>
              <AlertEngage>
                <span>
                  <CommentIcon />
                  {a.comments}
                </span>
                <span>
                  <HeartIcon />
                  {a.hearts}
                </span>
                <span>
                  <ViewsIcon />
                  {a.views}
                </span>
                <AlertShare aria-label="Share">
                  <ShareIcon />
                </AlertShare>
              </AlertEngage>
            </AlertCard>
          ))}
        </AlertGrid>
      </Wrap>
    </Alerts>
  );
}
