import Link from "next/link";
import styled from "styled-components";
import { SITE, LEGAL_LINKS } from "@/lib/site";
import { Brand } from "@/components/ui/Brand";
import { Container } from "@/components/ui/primitives";

// The footer keeps Kipita's dark-green brand chrome in both light and dark
// modes, so its colours are fixed rather than theme-driven.
const Footer = styled.footer`
  background: #17452f;
  color: #d7e7dd;
  padding: 64px 0 40px;

  a {
    color: #eaf4ee;
    opacity: 0.85;
    &:hover {
      opacity: 1;
    }
  }

  h4 {
    margin-top: 0;
  }
`;

const Cols = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  justify-content: space-between;
`;

const Links = styled.div`
  display: grid;
  gap: 10px;
`;

const Intro = styled.div`
  max-width: 320px;

  p {
    opacity: 0.85;
    margin: 0;
  }
`;

const Copyright = styled.p`
  opacity: 0.6;
  margin: 48px 0 0;
`;

export function SiteFooter() {
  return (
    <Footer>
      <Container>
        <Cols>
          <Intro>
            <div style={{ marginBottom: 12 }}>
              <Brand light />
            </div>
            <p>{SITE.description}</p>
          </Intro>

          <div>
            <h4>Legal</h4>
            <Links>
              {LEGAL_LINKS.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </Links>
          </div>

          <div>
            <h4>Company</h4>
            <Links>
              <a href={`mailto:${SITE.supportEmail}`}>Support</a>
              <Link href="/#how">How it works</Link>
              <Link href="/admin">Admin</Link>
            </Links>
          </div>
        </Cols>

        <Copyright>
          © {new Date().getFullYear()} {SITE.name}. Made for Kenya.
        </Copyright>
      </Container>
    </Footer>
  );
}
