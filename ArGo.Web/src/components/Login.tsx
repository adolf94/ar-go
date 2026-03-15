import { Box, Typography, Paper } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Login as LoginIcon } from '@mui/icons-material';

export const Login = () => {
  const { login } = useAuth();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh' 
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
          gap: 3
        }}
      >
        <LoginIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Welcome back
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Sign in with your Google account to manage your links and files securely.
        </Typography>
        
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            login(credentialResponse);
          }}
          onError={() => {
            console.error('Login Failed');
          }}
          useOneTap
          theme="filled_blue"
          shape="pill"
        />
      </Paper>
    </Box>
  );
};
