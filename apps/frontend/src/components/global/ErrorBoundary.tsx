import { Box, Button, Container, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional override fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary mounted around the route tree. Catches
 * render-phase errors and shows a friendly recovery UI with "Reload" and
 * "Go home" actions instead of a blank white screen.
 *
 * In development we also log the stack trace; in production a real APM
 * (Sentry, Datadog RUM) would replace `console.error`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('eawlma ErrorBoundary caught an error:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Container maxWidth="sm">
          <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '4rem', md: '6rem' }, fontWeight: 800, color: 'primary.main' }}>
              ⚠
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We hit an unexpected error rendering this page. The team has been notified.
              You can try reloading or head back to the home page.
            </Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'grey.100',
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'error.dark',
                maxWidth: 480,
                textAlign: 'start',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message || 'Unknown error'}
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
                Reload
              </Button>
              <Button variant="outlined" startIcon={<HomeIcon />} href="/">
                Go home
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    );
  }
}
