import type { ReactNode, SVGProps } from "react";

export type IconWeight = "regular" | "bold" | "fill";

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "children"> {
  size?: number | string;
  weight?: IconWeight;
}

export type KipitaIcon = (props: IconProps) => ReactNode;

const STROKE: Record<IconWeight, number> = {
  regular: 1.75,
  bold: 2.25,
  fill: 1.75,
};

export function createIcon(
  name: string,
  draw: (filled: boolean) => ReactNode,
  opts: { viewBox?: string } = {},
): KipitaIcon {
  const viewBox = opts.viewBox ?? "0 0 24 24";
  // Keep the apparent stroke weight constant across grids: a 20-unit glyph
  // needs a thinner stroke than a 24-unit one to look the same beside it.
  const span = Number(viewBox.split(/\s+/)[2]) || 24;
  const scale = span / 24;

  function Glyph({
    size = 24,
    weight = "regular",
    color = "currentColor",
    ...rest
  }: IconProps) {
    const labelled = rest["aria-label"] != null || rest.role === "img";
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={STROKE[weight] * scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={labelled ? undefined : true}
        focusable="false"
        {...rest}
      >
        {draw(weight === "fill")}
      </svg>
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

export const SOLID = { fill: "currentColor", stroke: "none" } as const;
