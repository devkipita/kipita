import React, { memo } from "react";
import { useTheme } from "@/hooks";
import MessageSvg from "@/assets/message.svg";
import ViewSvg from "@/assets/view.svg";

interface GlyphProps {
  size?: number;
  color?: string;
}

/**
 * Themed wrappers around the design-supplied SVG assets. The transformer maps
 * each file's `currentColor` fill to the `color` prop, so these tint with the
 * theme just like an icon font.
 */

/** Message / comment — speech bubble with three dots (assets/message.svg). */
export const MessageGlyph = memo(function MessageGlyph({
  size = 16,
  color,
}: GlyphProps) {
  const { colors } = useTheme();
  return <MessageSvg width={size} height={size} color={color ?? colors.text} />;
});

/** Views / analytics — four ascending bars (assets/view.svg). */
export const ViewsGlyph = memo(function ViewsGlyph({
  size = 16,
  color,
}: GlyphProps) {
  const { colors } = useTheme();
  return <ViewSvg width={size} height={size} color={color ?? colors.text} />;
});
