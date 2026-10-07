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
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
    color: ${nocturne.cream};
  }
  span {
    font-size: 12px;
    color: ${nocturne.muted};
  }

  @media (max-width: 640px) {
    width: 46%;

    strong {
      font-size: 16px;
    }
    span {
      font-size: 12px;
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
  b {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: #44a848;
    color: #ffffff;
    font-weight: 800;
  }
  .label {
    display: flex;
    flex-direction: column;
  }
  .label strong {
    font-size: 15px;
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
          <b aria-hidden>M</b>
          <span className="label">
            <strong>M-PESA</strong>
            Protected payments
          </span>
        </Mpesa>
      </Inner>
    </Strip>
  );
}
