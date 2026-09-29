import type { KipitaIcon as LucideIcon } from "@/components/icons";
import { ButtonAnchor, ButtonLink } from "./primitives";

type Variant = "primary" | "ghost" | "light";

/** Pill button/link used across the site. Internal routes use next/link. */
export function Button({
  href,
  children,
  variant = "primary",
  icon: Icon,
  iconRight: IconRight,
  compact = false,
  className = "",
  style,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const inner = (
    <>
      {Icon && <Icon size={20} />}
      {children}
      {IconRight && <IconRight size={20} />}
    </>
  );

  const shared = { $variant: variant, $compact: compact, className, style };

  if (href.startsWith("/")) {
    return (
      <ButtonLink href={href} {...shared}>
        {inner}
      </ButtonLink>
    );
  }
  return (
    <ButtonAnchor href={href} {...shared}>
      {inner}
    </ButtonAnchor>
  );
}
