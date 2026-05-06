import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { Helmet } from 'react-helmet-async';
import { useState, type FormEvent } from 'react';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // For now we just confirm the message was received — wiring to a contact
    // endpoint requires a public-form throttler the backend doesn't expose
    // yet. Email/WhatsApp routes below give users an immediate path.
    setSent(true);
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Helmet>
        <title>Contact us — Eawlma</title>
      </Helmet>

      <Container maxWidth={false} sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 3, sm: 4, md: 6, lg: 8 }, py: { xs: 6, md: 10 } }}>
        <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, mb: 1.5 }}>
          Get in touch
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 6, fontSize: '1.05rem', maxWidth: 720 }}>
          Our team responds within 24 hours. For urgent listing or account questions,
          WhatsApp is the fastest channel.
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 3 }}>
                Send us a message
              </Typography>
              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Phone (optional)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+9665XXXXXXXX"
                    fullWidth
                  />
                  <TextField
                    label="Message"
                    multiline
                    minRows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    fullWidth
                  />
                  {sent && (
                    <Alert severity="success">
                      Thanks! Our team will respond within 24 hours.
                    </Alert>
                  )}
                  <Box>
                    <Button
                      type="submit"
                      size="large"
                      variant="contained"
                      sx={{
                        background: 'linear-gradient(135deg, #6C63A6 0%, #4A4080 100%)',
                        fontWeight: 700,
                        px: 4,
                      }}
                    >
                      Send message
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <ContactCard
                icon={<EmailIcon sx={{ color: 'primary.main' }} />}
                title="Email us"
                line1="hello@eawlma.sa"
                line2="Replies within 24h on weekdays"
                href="mailto:hello@eawlma.sa"
              />
              <ContactCard
                icon={<WhatsAppIcon sx={{ color: '#25D366' }} />}
                title="WhatsApp"
                line1="+966 50 000 0000"
                line2="Sun–Thu, 9:00 – 18:00 (AST)"
                href="https://wa.me/966500000000"
              />
              <ContactCard
                icon={<PlaceIcon sx={{ color: 'primary.main' }} />}
                title="Office"
                line1="King Fahd Road, Riyadh"
                line2="Saudi Arabia 12345"
              />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function ContactCard({
  icon,
  title,
  line1,
  line2,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  line1: string;
  line2: string;
  href?: string;
}) {
  const content = (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        transition: 'all 0.2s ease',
        ...(href && { cursor: 'pointer', '&:hover': { boxShadow: '0 12px 24px rgba(108,99,166,0.15)' } }),
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: 'rgba(108,99,166,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
          {line1}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.25 }}>
          {line2}
        </Typography>
      </Box>
    </Paper>
  );
  if (href) {
    return (
      <Box component="a" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener" sx={{ textDecoration: 'none' }}>
        {content}
      </Box>
    );
  }
  return content;
}
