import { Box, Container, Stack, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>{t('privacy.title')} — {t('app.name')}</title>
      </Helmet>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, mb: 1 }}>
          {t('privacy.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 4 }}>
          {t('privacy.lastUpdated')}: 1 January 2026
        </Typography>

        <Stack spacing={4} sx={{ '& p': { color: 'text.secondary', lineHeight: 1.75 } }}>
          <Section title="1. Data we collect">
            <p>
              When you use Eawlma we collect: account details (name, email, phone),
              identity verification data when you choose to verify your account,
              listing content you publish (photos, descriptions, prices), saved
              searches and favourites, and standard interaction logs (page views,
              device, IP). We do not collect biometric data.
            </p>
          </Section>

          <Section title="2. How we use it">
            <p>
              We use your data to operate the platform — show you relevant
              listings, route inquiries to the right agent, send transactional
              notifications, prevent fraud, and meet our legal obligations. We
              never sell your personal data.
            </p>
          </Section>

          <Section title="3. Sharing & sub-processors">
            <p>
              Your data is shared only with the parties needed to provide the
              service: cloud hosting (AWS in the Bahrain region), email delivery
              (AWS SES), payments (Moyasar), translation (OpenAI for listing
              translations only — no PII), and Google Maps for location
              rendering. All sub-processors are bound by data-processing
              agreements.
            </p>
          </Section>

          <Section title="4. Your rights">
            <p>
              Under the PDPL you have the right to access, correct, port, and
              delete your personal data. You may also withdraw consent for any
              processing based on consent. To exercise any of these rights,
              email <a href="mailto:privacy@eawlma.sa" style={{ color: '#6C63A6', fontWeight: 700 }}>privacy@eawlma.sa</a>
              {' '}— we respond within 30 days.
            </p>
          </Section>

          <Section title="5. Retention">
            <p>
              We retain account data for the lifetime of your account plus 5
              years for audit and tax compliance. Inactive accounts are anonymised
              after 24 months. Listing photos you delete are permanently removed
              from primary storage within 30 days.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
              Passwords are hashed with Argon2id. Access to production data is
              limited to a small on-call team and fully audit-logged.
            </p>
          </Section>

          <Section title="7. Contact for data requests">
            <p>
              <strong>Data Protection Officer</strong><br />
              Eawlma Real Estate · King Fahd Road, Riyadh, Saudi Arabia<br />
              Email: <a href="mailto:privacy@eawlma.sa" style={{ color: '#6C63A6', fontWeight: 700 }}>privacy@eawlma.sa</a>
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
