"use client";

import styled from "styled-components";
import { MapSheet } from "@/components/trips/MapSheet";
import { Busy, Shimmer } from "@/components/ui/Shimmer";
import { nocturne } from "@/lib/nocturne";

const MapFill = styled.div`
  position: absolute;
  inset: 0;
  background: ${nocturne.surface2};

  @media (min-width: 900px) {
    position: static;
    height: 100%;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: clamp(20px, 4vh, 36px);

  .desk {
    display: contents;
  }

  @media (max-width: 899px) {
    padding-top: 0;

    .desk {
      display: none;
    }
  }
`;

const Stack = styled.div<{ $gap: string; $top?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap};
  margin-top: ${({ $top }) => $top ?? "0"};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 20px;
  background: ${nocturne.surface};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

export function RideDetailSkeleton() {
  return (
    <Busy>
      <MapSheet map={() => <MapFill />} mapTop={<Shimmer $w="46px" $h="46px" $r="50%" />}>
        <Top>
          <span className="desk">
            <Shimmer $w="46px" $h="46px" $r="50%" />
          </span>
          <Shimmer $w="150px" $h="32px" $r="999px" />
        </Top>
        <Stack $gap="12px" $top="18px">
          <Shimmer $w="min(420px, 88%)" $h="40px" $r="12px" />
          <Shimmer $w="min(300px, 70%)" $h="16px" />
        </Stack>
        <Chips>
          <Shimmer $w="190px" $h="38px" $r="12px" />
          <Shimmer $w="150px" $h="38px" $r="12px" />
        </Chips>
        <Stack $gap="14px" $top="20px">
          <Card>
            <Shimmer $w="150px" $h="38px" />
            <Shimmer $w="120px" $h="16px" />
            <Shimmer $h="56px" $r="999px" />
          </Card>
          <Card>
            <Shimmer $w="90px" $h="13px" />
            <Row>
              <Shimmer $w="64px" $h="64px" $r="50%" />
              <Stack $gap="10px">
                <Shimmer $w="200px" $h="24px" />
                <Shimmer $w="160px" $h="16px" />
              </Stack>
            </Row>
          </Card>
          <Card>
            <Shimmer $w="50px" $h="13px" />
            <Shimmer $w="min(300px, 86%)" $h="24px" />
          </Card>
        </Stack>
      </MapSheet>
    </Busy>
  );
}
