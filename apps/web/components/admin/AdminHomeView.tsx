"use client";

import styled from "styled-components";
import { ArrowUUpLeft as Undo2, Question as HelpCircle, Flag, QuestionCircle, SealCheck, Ticket, CaretRight as ChevronRight } from "@/components/icons";
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

/** Drivers are reviewed by hand, so the queue has to announce itself. */
const Waiting = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.warnBg};
  color: ${({ theme }) => theme.color.warnText};
  font-size: 0.8rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
`;

export function AdminHomeView({
  name,
  image,
  pendingDrivers = 0,
}: {
  name: string;
  image?: string;
  pendingDrivers?: number;
}) {
  return (
    <>
      <AdminBar name={name} image={image} />
      <Container style={{ padding: "48px 24px" }}>
        <H2>Operations</H2>
        <Lead>Manage Kipita day to day.</Lead>

        <Grid $cols={3} style={{ marginTop: 48 }}>
          <FeatureCardLink href="/admin/drivers">
            <IconBubble icon={SealCheck} variant="green" />
            <FeatureTitle>
              Driver verification
              {pendingDrivers > 0 && (
                <Waiting>
                  {pendingDrivers} waiting
                </Waiting>
              )}
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              {pendingDrivers > 0
                ? `${pendingDrivers === 1 ? "One driver has" : `${pendingDrivers} drivers have`} sent documents and cannot publish until you review them.`
                : "Check licences and IDs, then approve or reject drivers waiting to publish."}
            </FeatureBody>
          </FeatureCardLink>

          <FeatureCardLink href="/admin/refunds">
            <IconBubble icon={Undo2} variant="green" />
            <FeatureTitle>
              Refund requests
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              Review cancellations, refund the passenger or release to the
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

          <FeatureCardLink href="/admin/support">
            <IconBubble icon={QuestionCircle} variant="green" />
            <FeatureTitle>
              Support
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              Read and answer open support cases from passengers and drivers.
            </FeatureBody>
          </FeatureCardLink>

          <FeatureCardLink href="/admin/promotions">
            <IconBubble icon={Ticket} variant="green" />
            <FeatureTitle>
              Offers
              <InlineChevron data-chevron>
                <ChevronRight size={18} />
              </InlineChevron>
            </FeatureTitle>
            <FeatureBody>
              Create the gift cards and discounts shown on the home page.
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
