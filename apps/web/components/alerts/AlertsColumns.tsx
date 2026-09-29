"use client";

import type { ReactNode } from "react";
import styled from "styled-components";

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 28px;
  align-items: start;
  max-width: 1000px;
  margin: 0 auto;
  padding-inline: var(--page-pad);

  @media (max-width: 1199px) {
    grid-template-columns: minmax(0, 1fr);
    max-width: 640px;
  }
`;

const Main = styled.div`
  min-width: 0;
`;

const Side = styled.aside`
  position: sticky;
  top: calc(var(--sticky-top, 0px) + 16px);
  padding-top: 16px;

  @media (max-width: 1199px) {
    display: none;
  }
`;

export function AlertsColumns({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <Grid>
      <Main>{children}</Main>
      <Side aria-label="Trending and help">{aside}</Side>
    </Grid>
  );
}
