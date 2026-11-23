import { useId, type ReactNode, type SVGProps } from "react";

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
  opts: { viewBox?: string; cut?: () => ReactNode; over?: () => ReactNode } = {},
): KipitaIcon {
  const viewBox = opts.viewBox ?? "0 0 24 24";
  const span = Number(viewBox.split(/\s+/)[2]) || 24;
  const scale = span / 24;
  const cut = opts.cut;
  const over = opts.over;

  function Glyph({
    size = 24,
    weight = "regular",
    color = "currentColor",
    ...rest
  }: IconProps) {
    const maskId = useId();
    const labelled = rest["aria-label"] != null || rest.role === "img";
    const filled = weight === "fill";
    const body =
      filled && cut ? (
        <>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={span} height={span}>
            <rect width={span} height={span} fill="white" stroke="none" />
            <g stroke="black" fill="none">
              {cut()}
            </g>
          </mask>
          <g mask={`url(#${maskId})`}>{draw(true)}</g>
          {over?.()}
        </>
      ) : (
        draw(filled)
      );
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
        {body}
      </svg>
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

export const SOLID = { fill: "currentColor", stroke: "none" } as const;
export const HOLE = { fill: "black", stroke: "none" } as const;
