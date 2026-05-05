import { Box, Container, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

export function TermsPage() {
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>Terms of Service — Eawlma</title>
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, mb: 1 }}>
          Terms of Service
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 4 }}>
          Effective: 1 January 2026 · Governed by the laws of the Kingdom of Saudi
          Arabia.
        </Typography>

        <Stack spacing={4} sx={{ '& p': { color: 'text.secondary', lineHeight: 1.75 } }}>
          <Section title="1. Use of the platform">
            <p>
              Eawlma is a marketplace that connects property seekers with
              verified agents and owners. By accessing the platform you agree to
              use it lawfully, not to scrape or reverse-engineer it, and to
              respect other users' privacy. You must be 18 or older to create an
              account.
            </p>
          </Section>

          <Section title="2. Listings policy">
            <p>
              Every listing must be: (a) for a real, available property; (b)
              accurately described with current photos taken within the past 12
              months; (c) priced in good faith; and (d) free of misleading
              language. We may remove listings that violate these rules without
              notice and may suspend repeat offenders.
            </p>
          </Section>

          <Section title="3. Agent obligations">
            <p>
              Agents must hold a valid REGA license number on their profile,
              respond to inquiries within 48 hours, and conduct viewings safely
              and professionally. Agents are independent — Eawlma does not
              employ them and is not liable for their conduct, but reserves the
              right to remove agents who breach these terms.
            </p>
          </Section>

          <Section title="4. Payment terms">
            <p>
              Subscription fees and feature charges are billed in advance via
              Moyasar. Subscriptions auto-renew; you may cancel at any time
              through the dashboard, with the cancellation taking effect at the
              end of the current billing period. Refunds are issued only for
              clear billing errors and within 30 days of the disputed charge.
            </p>
          </Section>

          <Section title="5. Intellectual property">
            <p>
              You retain copyright in the photos and descriptions you upload.
              By posting them you grant Eawlma a non-exclusive, royalty-free
              licence to host, resize, and display your content as needed to
              operate the platform. The Eawlma brand, logo, and software are our
              property.
            </p>
          </Section>

          <Section title="6. Limitation of liability">
            <p>
              The platform is provided "as is". To the maximum extent permitted
              by Saudi law, Eawlma is not liable for indirect, incidental, or
              consequential damages, and our total liability for any claim is
              capped at the fees you have paid us in the 12 months prior to the
              claim.
            </p>
          </Section>

          <Section title="7. Dispute resolution">
            <p>
              These terms are governed by the laws of the Kingdom of Saudi
              Arabia. Any dispute will first be addressed in good faith
              negotiation; if unresolved within 60 days, the dispute will be
              referred to the competent courts of Riyadh.
            </p>
          </Section>

          <Section title="8. Changes to these terms">
            <p>
              We may update these terms from time to time. Material changes are
              announced via in-app notification at least 14 days before they
              take effect. Continued use of the platform after that date
              constitutes acceptance of the revised terms.
            </p>
          </Section>
        </Stack>
      </Container>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 1.25, color: 'text.primary' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
