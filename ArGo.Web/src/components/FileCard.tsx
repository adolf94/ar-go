import { Box, Typography, Card, CardContent, Button, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import { InsertDriveFile, AddLink } from '@mui/icons-material';

interface FileCardProps {
  file: any;
  onGenerateLink: (file: any) => void;
}

export const FileCard = ({ file, onGenerateLink }: FileCardProps) => {
  return (
    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <InsertDriveFile color="primary" />
          <Tooltip title={file.fileName || file.blobName} arrow>
            <Typography
              variant="subtitle2"
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '220px'
              }}
            >
              {file.fileName || file.blobName}
            </Typography>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
          ID: {file.id}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Storage Retention: {dayjs(file.storageExpirationUtc).format('YYYY-MM-DD HH:mm')}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            startIcon={<AddLink />}
            onClick={() => onGenerateLink(file)}
            variant="outlined"
          >
            Generate Link
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
