"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  formatKes,
  nextTier,
  REFEREE_REWARD,
  REFERRAL_TIERS,
  referralLink,
  shareMessage,
  tierFor,
  toGo,
  type ReferralEntry,
  type ReferralSummary,
} from "@kipita/shared";
import {
  ArrowRight,
  Check,
  Copy,
  Envelope,
  Gift,
  ShareNetwork,
  Users,
} from "@/components/icons";
import { ContentWidth } from "@/components/nav/AppShell";
import { ButtonEl } from "@/components/ui/primitives";
import { ReferralBanner } from "./ReferralBanner";

const Page = styled(ContentWidth)`
  padding-block: 0 48px;
  display: grid;
  gap: 34px;
  max-width: 720px;
`;

const Intro = styled.header`
  display: grid;
  gap: 14px;
  padding-top: 28px;

  h1 {
    margin: 0;
    font-size: clamp(2.1rem, 6vw, 2.9rem);
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    max-width: 34ch;
    font-size: clamp(1.05rem, 2.4vw, 1.25rem);
    line-height: 1.45;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Block = styled.section`
  display: grid;
  gap: 18px;

  > h2 {
    margin: 0;
    font-size: clamp(1.45rem, 3.6vw, 1.75rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Perk = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;

  .glyph {
    flex: none;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.tone.mint.bg};
    color: ${({ theme }) => theme.tone.mint.on};
  }
  b {
    display: block;
    font-size: clamp(1.1rem, 2.6vw, 1.3rem);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 6px 0 0;
    max-width: 44ch;
    font-size: 1rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const Stat = styled.div`
  display: grid;
  gap: 2px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .value {
    font-size: clamp(1.4rem, 4vw, 1.8rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.color.onSurface};
  }
  .cap {
    font-size: 0.86rem;
    font-weight: 600;
    color: ${({ theme }) => theme.color.onSurfaceVariant};
  }
`;

const TierNote = styled.p`
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  b {
    color: ${({ theme }) => theme.color.onSurface};
  }
`;

const Faq = styled.div`
  display: grid;
  gap: 4px;

  span {
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.color.primary};
  }
  a:hover {
    text-decoration: underline;
  }
`;

const CodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerHigh};

  .code {
    flex: 1;
    min-width: 0;
    font-size: clamp(1.05rem, 3vw, 1.3rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.color.onSurface};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const CopyButton = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceContainerLowest};
  color: ${({ theme }) => theme.color.onSurface};
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;

  @media (hover: hover) {
    &:hover {
      background: ${({ theme }) => theme.color.surfaceContainer};
    }
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`;

const Cta = styled(ButtonEl)`
  width: 100%;
  height: 58px;
  font-size: 1.1rem;
`;

const Unavailable = styled.div`
  display: grid;
  gap: 6px;
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.warnBg};
  color: ${({ theme }) => theme.color.warnText};

  b {
    font-size: 1.02rem;
  }
  p {
    margin: 0;
    max-width: 50ch;
    font-size: 0.95rem;
    line-height: 1.5;
  }
`;

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceContainerLow};

  .who {
    flex: 1;
    min-width: 0;
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.color.onSurface};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Tag = styled.span<{ $done: boolean }>`
  flex: none;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 800;
  background: ${({ theme, $done }) =>
    $done ? theme.tone.mint.bg : theme.color.surfaceContainerHigh};
  color: ${({ theme, $done }) =>
    $done ? theme.tone.mint.on : theme.color.onSurfaceVariant};
`;

const Empty = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceContainerLow};
  color: ${({ theme }) => theme.color.onSurfaceVariant};

  b {
    font-size: 1.05rem;
    color: ${({ theme }) => theme.color.onSurface};
  }
  p {
    margin: 0;
    max-width: 42ch;
    line-height: 1.5;
  }
`;

export function ReferralView({
  summary,
  entries,
}: {
  summary: ReferralSummary;
  entries: ReferralEntry[];
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? referralLink(origin, summary.code) : "";
  const current = tierFor(summary.joined);
  const upcoming = nextTier(summary.joined);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(summary.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* empty */
    }
  }

  async function share() {
    const text = shareMessage(summary.code, link);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Kipita", text, url: link });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* empty */
    }
  }

  return (
    <>
      <ReferralBanner />

      <Page>
        <Intro>
          <h1>Earn {formatKes(current.reward)} for each referral</h1>
          <p>
            For each friend you invite who completes their first Kipita ride,
            you both get wallet credit.
          </p>
        </Intro>

        <Block>
          <h2>You get</h2>
          <Perk>
            <span className="glyph">
              <Gift size={26} />
            </span>
            <div>
              <b>{formatKes(current.reward)} in your Kipita wallet</b>
              <p>
                Paid once your friend finishes their first ride. Spend it on
                fares or withdraw it to M-Pesa.
              </p>
            </div>
          </Perk>
        </Block>

        <Block>
          <h2>Your friends get</h2>
          <Perk>
            <span className="glyph">
              <Envelope size={26} />
            </span>
            <div>
              <b>{formatKes(REFEREE_REWARD)} off their first ride</b>
              <p>
                Credited to their wallet as soon as that first trip is
                complete.
              </p>
            </div>
          </Perk>
        </Block>

        <Stats>
          <Stat>
            <span className="value">{summary.joined}</span>
            <span className="cap">Joined</span>
          </Stat>
          <Stat>
            <span className="value">{summary.pending}</span>
            <span className="cap">Pending</span>
          </Stat>
          <Stat>
            <span className="value">{formatKes(summary.earned)}</span>
            <span className="cap">Earned</span>
          </Stat>
        </Stats>

        <TierNote>
          You&apos;re on <b>{current.label}</b>, earning{" "}
          <b>{formatKes(current.reward)}</b> per referral.{" "}
          {upcoming
            ? `${toGo(summary.joined)} more takes you to ${upcoming.label} at ${formatKes(upcoming.reward)} each.`
            : `That's the top of the ${REFERRAL_TIERS.length}-tier ladder.`}
        </TierNote>

        <Faq>
          <span>Have additional questions?</span>
          <a href="/help#faq">
            Read the FAQs
            <ArrowRight size={16} />
          </a>
        </Faq>

        {summary.code ? (
          <>
            <CodeRow>
              <span className="code">{summary.code}</span>
              <CopyButton
                type="button"
                onClick={copyCode}
                aria-label="Copy your referral code"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? "Copied" : "Copy"}
              </CopyButton>
            </CodeRow>

            <Cta type="button" onClick={share}>
              <ShareNetwork size={20} />
              Invite friends
            </Cta>
          </>
        ) : (
          <Unavailable role="status">
            <b>Your code isn&apos;t ready yet</b>
            <p>
              We couldn&apos;t reach the referral service. Refresh in a moment —
              your code is created automatically the first time this page loads.
            </p>
          </Unavailable>
        )}

        <Block>
          <h2>Your invites</h2>
          {entries.length === 0 ? (
            <Empty>
              <Users size={28} />
              <b>No one yet</b>
              <p>
                Send your code to someone who travels your route. Nothing is
                paid until their first ride is done.
              </p>
            </Empty>
          ) : (
            <Rows>
              {entries.map((entry) => (
                <Row key={entry.id}>
                  <span className="who">{entry.name}</span>
                  <Tag $done={entry.status === "rewarded"}>
                    {entry.status === "rewarded"
                      ? `+${formatKes(entry.reward)}`
                      : entry.status === "pending"
                        ? "Awaiting first ride"
                        : "Expired"}
                  </Tag>
                </Row>
              ))}
            </Rows>
          )}
        </Block>
      </Page>
    </>
  );
}
