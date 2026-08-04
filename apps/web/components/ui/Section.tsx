import { Container, Section as SectionEl } from "./primitives";

/** Standard page section — vertical rhythm + centered container. */
export function Section({
  id,
  children,
  alt = false,
  className = "",
  style,
}: {
  id?: string;
  children: React.ReactNode;
  alt?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <SectionEl id={id} $alt={alt} className={className} style={style}>
      <Container>{children}</Container>
    </SectionEl>
  );
}
