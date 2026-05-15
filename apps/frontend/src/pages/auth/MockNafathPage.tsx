import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

/**
 * Dev-only stand-in for Absher's Nafath approval screen. Reachable when the
 * backend hits `/auth/nafath/authorize` without `NAFATH_CLIENT_ID` configured —
 * in production the user lands on Absher's real screen instead. "Approve"
 * walks the same backend redirect chain as a real callback (mock-callback →
 * NafathCallbackPage with tokens in the URL), so token hydration stays in one
 * place.
 */
export function MockNafathPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://192.168.1.125:3010/api/v1';

  const handleApprove = () => {
    setLoading(true);
    // Full-page navigation — the backend redirects back to
    // /auth/nafath-callback?accessToken=…&refreshToken=…, and that page
    // hydrates the auth store and bounces the user home.
    window.location.href = `${apiBase}/auth/nafath/mock-callback`;
  };

  const handleReject = () => {
    void navigate({ to: '/auth/login' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#00543D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 3,
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 24px 56px rgba(0,84,61,0.32)',
        }}
      >
        <Box
          sx={{
            bgcolor: '#00543D',
            borderRadius: 2,
            py: 2,
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, lineHeight: 1 }}>
            نفاذ
          </Typography>
          <Typography variant="caption" sx={{ color: 'white', letterSpacing: 2 }}>
            NAFATH
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          طلب تسجيل الدخول
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Login Request
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          تطبيق Eawlma يطلب الوصول إلى حسابك
          <br />
          Eawlma is requesting access to your account
        </Typography>

        <Stack
          spacing={1.25}
          sx={{
            bgcolor: '#f5f5f5',
            borderRadius: 2,
            p: 2,
            mb: 3,
            textAlign: 'right',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              الاسم / Name
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              محمد القحطاني / Mohammed Al-Qahtani
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              رقم الهوية / National ID
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>1234567890</Typography>
          </Box>
        </Stack>

        <Button
          fullWidth
          variant="contained"
          onClick={handleApprove}
          disabled={loading}
          sx={{
            bgcolor: '#00543D',
            mb: 1.5,
            py: 1.5,
            fontWeight: 700,
            '&:hover': { bgcolor: '#003d2d' },
          }}
        >
          {loading ? '...' : 'موافقة / Approve'}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={handleReject}
          sx={{ borderColor: '#ccc', color: 'text.secondary' }}
        >
          رفض / Reject
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2 }}
        >
          🔒 DEV MODE — Mock Nafath Page
        </Typography>
      </Box>
    </Box>
  );
}
