import { Box, Typography, Paper, Button, CircularProgress, Tooltip } from '@mui/material';
import { LockOpen, Fingerprint } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Login as LoginIcon } from '@mui/icons-material';
import { useState } from 'react';

// Inline SVG icons for brand logos not in MUI
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#29B6F6"/>
    <path fill="#fff" d="M34.11 14.27L10.53 23.16c-1.56.62-1.55 1.49-.28 1.88l6.12 1.91 14.14-8.93c.67-.4 1.28-.18.78.26L19.1 28.26l-.47 6.35c.69 0 1-.31 1.37-.67l3.29-3.19 6.84 5.05c1.26.7 2.16.34 2.47-1.17l4.47-21.07c.46-1.84-.7-2.67-2-.96z"/>
  </svg>
);

const loginMethods = [
  { label: 'Google', icon: <GoogleIcon /> },
  { label: 'Passkey', icon: <Fingerprint sx={{ fontSize: 18, color: '#9E9E9E' }} /> },
  { label: 'Telegram', icon: <TelegramIcon /> },
];

export const Login = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await login();
    } catch (e) {
      setError('Login failed or was cancelled. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Paper
        className="glass-card"
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <LoginIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Welcome back
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Sign in to manage your links and files securely.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOpen />}
          onClick={handleLogin}
          disabled={loading}
          sx={{
            borderRadius: 8,
            px: 6,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          {loading ? 'Opening login…' : 'Sign in'}
        </Button>

        {/* Supported login methods */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.disabled">
            Supports
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {loginMethods.map(({ label, icon }) => (
              <Tooltip key={label} title={`Sign in with ${label}`} arrow>
                <Box
                  onClick={!loading ? handleLogin : undefined}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: loading ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1,
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.13)',
                      transform: !loading ? 'scale(1.1)' : 'none',
                      borderColor: 'primary.main'
                    },
                  }}
                >
                  {icon}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>

        {error && (
          <Typography color="error" variant="caption">
            {error}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
