import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Container, Box, Typography, Paper, Tabs, Tab, Avatar, IconButton, Tooltip } from '@mui/material';
import { CloudUpload, Link as LinkIcon, Dashboard, Logout } from '@mui/icons-material';
import { Login } from '../components/Login';
import { useAuth } from '../context/AuthContext';

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  
  // Map current path to tab index
  const tabPaths = ['/app/file-drop', '/app/url-shortener', '/app/dashboard'];
  const currentPath = routerState.location.pathname;
  const activeTab = tabPaths.indexOf(currentPath) === -1 ? 0 : tabPaths.indexOf(currentPath);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    navigate({ to: tabPaths[newValue] });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6">Restoring Session...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h1" className="gradient-text" gutterBottom>
            ArGo
          </Typography>
          <Login />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Avatar src={user?.picture} sx={{ width: 40, height: 40, border: '2px solid rgba(255,255,255,0.1)' }} />
        <Tooltip title="Logout">
          <IconButton onClick={logout} color="error" size="small">
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h1" className="gradient-text" gutterBottom sx={{ fontSize: { xs: '3rem', md: '4.5rem' } }}>
          ArGo
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 6, fontWeight: 400 }}>
          Secure File-Drop & Persistent URL Shortener
        </Typography>

        <Paper className="glass-card" sx={{ overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<CloudUpload />} label="File Drop" />
            <Tab icon={<LinkIcon />} label="Shorten URL" />
            <Tab icon={<Dashboard />} label="My Items" />
          </Tabs>

          <Box sx={{ p: 4, minHeight: 400, textAlign: 'left' }}>
            <Outlet />
          </Box>
        </Paper>

        <Box sx={{ mt: 8 }}>
          <Typography variant="body2" color="text.secondary">
            Built with .NET 9, Cosmos DB, and Azure Blob Storage.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
