import { Fragment } from "react";
import styled from "styled-components";
import { nocturne } from "../nocturne";
import { Reveal } from "../../anim/Reveal";
import { RollingNumber } from "../../ui/Counter";
import { TRUST_STATS } from "../data";

const Strip = styled.section`
  background: ${nocturne.bg};
`;

const Inner = styled(Reveal)`
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 34px;

  @media (max-width: 640px) {
    justify-content: space-between;
    gap: 18px 8px;
    padding: 25px 18px;
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;

  strong {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-manrope), var(--font-dm), system-ui, sans-serif;
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    color: ${nocturne.cream};
  }
  /* Direct child only — a bare \`span\` also matched the rolling counter's
     internal spans and halved the digits to 15px. */
  > span {
    font-size: 15px;
    line-height: 1.35;
    color: ${nocturne.muted};
  }

  @media (max-width: 640px) {
    width: 46%;

    strong {
      font-size: 24px;
    }
    > span {
      font-size: 14px;
    }
  }
`;

const Divider = styled.i`
  width: 1px;
  height: 32px;
  background: ${nocturne.line};

  @media (max-width: 960px) {
    display: none;
  }
`;

const Mpesa = styled(Item)`
  img {
    display: block;
    width: auto;
    height: 34px;
    flex: none;
  }
  .label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  @media (max-width: 640px) {
    img {
      height: 28px;
    }
  }
`;

export function TrustStrip() {
  return (
    <Strip aria-label="Why riders choose Kipita">
      <Inner stagger={0.06}>
        {TRUST_STATS.map((s, i) => (
          <Fragment key={s.label}>
            <Item>
              <strong>
                <RollingNumber
                  value={s.value}
                  decimals={s.dec}
                  ariaLabel={`${s.value}${s.suffix} ${s.label}`}
                />
                {s.suffix}
              </strong>
              <span>{s.label}</span>
            </Item>
            {i < TRUST_STATS.length - 1 && <Divider />}
          </Fragment>
        ))}
        <Divider />
        <Mpesa as="div">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/mpesa.png" alt="M-PESA" />
          <span className="label">
            <span>Protected payments</span>
          </span>
        </Mpesa>
      </Inner>
    </Strip>
  );
}
