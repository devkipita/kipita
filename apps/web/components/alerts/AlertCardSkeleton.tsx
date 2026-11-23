"use client";

import styled from "styled-components";
import { Shimmer } from "@/components/ui/Shimmer";
import { nocturne } from "@/lib/nocturne";

const Shell = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${nocturne.line};
  border-radius: 16px;
  background: ${nocturne.surface};
`;

const Row = styled.div<{ $between?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $between }) => ($between ? "space-between" : "flex-start")};
  gap: 8px;
  min-height: 32px;
`;

const Lines = styled.div<{ $gap: string }>`
  display: grid;
  gap: ${({ $gap }) => $gap};
`;

const Line = styled.div<{ $h: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  height: ${({ $h }) => $h};
`;

const Foot = styled(Row)`
  padding-top: 12px;
  border-top: 1px solid ${nocturne.line};
  min-height: 52px;
`;

export function AlertCardSkeleton() {
  return (
    <Shell aria-hidden>
      <Row>
        <Shimmer $w="88px" $h="24px" $r="6px" />
        <Shimmer $w="28px" $h="12px" />
      </Row>
      <Lines $gap="4px">
        <Line $h="24px">
          <Shimmer $w="55%" $h="18px" $r="6px" />
        </Line>
        <Line $h="20px">
          <Shimmer $w="35%" $h="12px" />
        </Line>
      </Lines>
      <Lines $gap="0px">
        <Line $h="22px">
          <Shimmer $w="92%" $h="14px" />
        </Line>
        <Line $h="22px">
          <Shimmer $w="68%" $h="14px" />
        </Line>
      </Lines>
      <Line $h="24px">
        <Shimmer $w="24px" $h="24px" $r="999px" $mb="0" />
        <Shimmer $w="112px" $h="12px" />
      </Line>
      <Foot $between>
        <Row>
          <Shimmer $w="112px" $h="32px" $r="8px" />
          <Shimmer $w="96px" $h="32px" $r="8px" />
        </Row>
        <Row>
          <Shimmer $w="20px" $h="20px" $r="6px" />
          <Shimmer $w="20px" $h="20px" $r="6px" />
          <Shimmer $w="20px" $h="20px" $r="6px" />
          <Shimmer $w="20px" $h="20px" $r="6px" />
        </Row>
      </Foot>
    </Shell>
  );
}
