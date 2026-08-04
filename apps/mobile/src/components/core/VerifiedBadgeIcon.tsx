import React, { memo } from "react";
import Svg, { Path } from "react-native-svg";

interface VerifiedBadgeIconProps {
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

export const VerifiedBadgeIcon = memo(function VerifiedBadgeIcon({
  size = 16,
  stroke = "#1F4734",
  fill = "#96C93D",
  strokeWidth = 2.1,
}: VerifiedBadgeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 12 2 2 4-4"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});
