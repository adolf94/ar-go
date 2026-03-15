import { useState } from 'react';
import { Box, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import { Link as LinkIcon, InsertDriveFile, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyItems } from '../repositories/itemRepository';
import { deleteLink } from '../repositories/linkRepository';
import { GenerateFileLinkDialog } from './GenerateFileLinkDialog';
import { LinkCard } from './LinkCard';
import { FileCard } from './FileCard';

import { useAuth } from '../context/AuthContext';

export const MyItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.email || 'anonymous';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['myItems'],
    queryFn: () => getMyItems(userId),
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleOpenLinkDialog = (file: any) => {
    setSelectedFile(file);
    setLinkDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (shortCode: string) => deleteLink(shortCode, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
    },
  });





  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Error loading items: {(error as any).message}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">My Dashboard</Typography>
        <IconButton onClick={() => refetch()} disabled={isLoading} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon /> Links & Redirects
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3, mb: 6 }}>
        {data?.links?.map((link: any) => (
          <LinkCard 
            key={link.id} 
            link={link} 
            onDelete={(shortCode) => deleteMutation.mutate(shortCode)} 
          />
        ))}
        {(!data?.links || data.links.length === 0) && (
          <Typography color="text.disabled" sx={{ fontStyle: 'italic' }}>No links found.</Typography>
        )}
      </Box>

      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <InsertDriveFile /> Files
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {data?.files?.map((file: any) => (
          <FileCard 
            key={file.id} 
            file={file} 
            onGenerateLink={handleOpenLinkDialog} 
          />
        ))}
        {(!data?.files || data.files.length === 0) && (
          <Typography color="text.disabled" sx={{ fontStyle: 'italic' }}>No files found.</Typography>
        )}
      </Box>

      <GenerateFileLinkDialog 
        open={linkDialogOpen} 
        onClose={() => setLinkDialogOpen(false)} 
        file={selectedFile}
        userId={userId}
      />
    </Box>
  );
};
