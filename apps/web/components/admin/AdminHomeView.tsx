"use client";

import { Undo2, HelpCircle, Flag, ChevronRight } from "lucide-react";
import { AdminBar } from "@/components/admin/AdminBar";
import { IconBubble } from "@/components/ui/IconBubble";
import { Container, Grid, H2, Lead } from "@/components/ui/primitives";
import {
  FeatureCardBox,
  FeatureCardLink,
  FeatureTitle,
  FeatureBody,
  InlineChevron,
} from "@/components/ui/FeatureCard";

export function AdminHomeView({ name, image }: { name: string, image?: string }) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Operations</H2>
        <Lead>Manage Kipita day to day.</Lead>

        <Grid $cols={3} style={{ marginTop: 48 }}>
          <FeatureCardLink href="/admin/refunds">
            <IconBubble icon={Undo2} variant="green" />
            <FeatureTitle>
              Refund requests
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              Review cancellations — refund the passenger or release to the
              driver.
            </FeatureBody>
          </FeatureCardLink>

          <FeatureCardLink href="/admin/faq">
            <IconBubble icon={HelpCircle} variant="green" />
            <FeatureTitle>
              Help FAQ
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              Add and edit the questions shown on the /help page.
            </FeatureBody>
          </FeatureCardLink>

          <FeatureCardBox style={{ opacity: 0.55 }}>
            <IconBubble icon={Flag} />
            <FeatureTitle>Reports</FeatureTitle>
            <FeatureBody>Coming soon.</FeatureBody>
          </FeatureCardBox>
        </Grid>
      </Container>
    </>
  );
}
