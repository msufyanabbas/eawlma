import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';

const SUPPORT_PHONE = '+966 50 000 0000';
const WHATSAPP_HREF = 'https://wa.me/966500000000';

const SOCIAL_LINKS = {
  twitter:   'https://twitter.com/eawlma',
  instagram: 'https://instagram.com/eawlma',
  facebook:  'https://facebook.com/eawlma',
  linkedin:  'https://linkedin.com/company/eawlma',
};

export function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        pt: { xs: 4, md: 5 },
        pb: 3,
        mt: 4,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, sm: 4, md: 6 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
        >
          {/* Brand block */}
          <Box sx={{ flex: { md: 1.4 }, maxWidth: { md: 380 } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: -0.4,
                color: 'primary.main',
                fontFamily: 'Tajawal, "IBM Plex Sans Arabic", sans-serif',
                mb: 1.5,
              }}
            >
              {t('app.name')}
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7, mb: 2.5 }}>
              {t('footer.tagline')}
            </Typography>

            {/* WhatsApp CTA */}
            <Button
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener"
              startIcon={<WhatsAppIcon />}
              variant="outlined"
              size="small"
              sx={{
                color: '#25D366',
                borderColor: alpha('#25D366', 0.4),
                fontWeight: 700,
                '&:hover': {
                  borderColor: '#25D366',
                  bgcolor: alpha('#25D366', 0.06),
                },
              }}
            >
              {SUPPORT_PHONE}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('footer.needHelp')}
            </Typography>

            {/* Company info — CR, REGA license, location. Owner replaces the
             *  CR placeholder with the real registration number when issued. */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8rem' }}>
                {t('footer.cr')}: XXXX-XXXXXXX
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8rem' }}>
                {t('footer.regaLicensed')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                {t('footer.location')}
              </Typography>
            </Box>
          </Box>

          {/* Link columns */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 4, sm: 8 }}
            sx={{ flex: { md: 1 } }}
          >
            <FooterColumn title={t('footer.explore')}>
              <FooterLink href="/search?type=sale">{t('listing.forSale')}</FooterLink>
              <FooterLink href="/search?type=rent">{t('listing.forRent')}</FooterLink>
              <FooterLink href="/agents">{t('nav.agents')}</FooterLink>
              <FooterLink href="/search">{t('nav.search')}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t('footer.company')}>
              <FooterLink href="/about">{t('footer.about')}</FooterLink>
              <FooterLink href="/contact">{t('footer.contact')}</FooterLink>
              <FooterLink href="/help">{t('footer.help')}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t('footer.legal')}>
              <FooterLink href="/privacy">{t('footer.privacy')}</FooterLink>
              <FooterLink href="/terms">{t('footer.terms')}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t('footer.support')}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.primary">{SUPPORT_PHONE}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Link
                  href="mailto:hello@eawlma.sa"
                  underline="hover"
                  variant="body2"
                  color="text.primary"
                >
                  hello@eawlma.sa
                </Link>
              </Stack>
            </FooterColumn>
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            © {new Date().getFullYear()} {t('app.name')} — {t('footer.rights')}.
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              aria-label={t('footer.whatsapp')}
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener"
              sx={{ color: '#25D366' }}
            >
              <WhatsAppIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Twitter / X" href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener">
              <TwitterIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Facebook" href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener">
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Instagram" href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener">
              <InstagramIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="LinkedIn" href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener">
              <LinkedInIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={1.25} sx={{ minWidth: 140 }}>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.6 }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      underline="hover"
      color="text.primary"
      sx={{ fontSize: '0.95rem' }}
    >
      {children}
    </Link>
  );
}
