import { useState } from 'react';
import { Box, Typography, Card, CardContent, IconButton, Chip, Avatar, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import { ContentCopy, OpenInNew, Delete, Link as LinkIcon } from '@mui/icons-material';

interface LinkCardProps {
  link: any;
  onDelete: (shortCode: string) => void;
}

export const LinkCard = ({ link, onDelete }: LinkCardProps) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const copyToClipboard = (shortCode: string) => {
    navigator.clipboard.writeText(`${window.location.host}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openLink = (shortCode: string) => {
    window.open(`${window.location.origin}/${shortCode}`, '_blank');
  };

  return (
    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderLeft: link.themeColor ? `4px solid ${link.themeColor}` : 'none' }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {link.iconUrl ? <Avatar src={link.iconUrl} variant="rounded" /> : <LinkIcon color="disabled" />}
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="caption" color="primary">{link.siteName || 'Link'}</Typography>
            <Tooltip title={link.title || link.shortCode} arrow>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                {link.title || link.shortCode}
              </Typography>
            </Tooltip>
          </Box>
          <Chip size="small" label={link.type === 0 ? "URL" : "File"} variant="outlined" />
        </Box>

        {link.description && (
          <Tooltip title={link.description} arrow>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                display: '-webkit-box', 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: 'vertical', 
                overflow: 'hidden' 
              }}
            >
              {link.description}
            </Typography>
          </Tooltip>
        )}

        <Tooltip title={link.longUrl} arrow>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1, 
              fontSize: '0.75rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            Long URL: {link.longUrl}
          </Typography>
        </Tooltip>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
              Created: {dayjs(link.createdAt).format('YYYY-MM-DD')}
            </Typography>
            <Typography variant="caption" color={dayjs(link.expirationUtc).isBefore(dayjs()) ? "error" : "text.disabled"}>
              Expires: {dayjs(link.expirationUtc).format('YYYY-MM-DD HH:mm')}
            </Typography>
          </Box>
          <Box>
            <Tooltip 
              title={copied ? "Copied!" : "Copy link"} 
              open={hovered || copied} 
              onOpen={() => setHovered(true)}
              onClose={() => setHovered(false)}
              placement="top" 
              arrow
            >
              <IconButton size="small" onClick={() => copyToClipboard(link.shortCode)} color={copied ? "success" : "default"}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => openLink(link.shortCode)}><OpenInNew fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => onDelete(link.shortCode)}><Delete fontSize="small" /></IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
