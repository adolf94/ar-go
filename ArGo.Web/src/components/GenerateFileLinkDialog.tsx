import { useState, useEffect } from 'react';
import { 
  Box, Typography, IconButton, Button, CircularProgress, 
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, TextField, 
  Accordion, AccordionSummary, AccordionDetails 
} from '@mui/material';
import { 
  ContentCopy, ExpandMore, Info, AddLink 
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateFileLink } from '../repositories/linkRepository';

interface GenerateFileLinkDialogProps {
  open: boolean;
  onClose: () => void;
  file: any;
  userId: string;
}

export const GenerateFileLinkDialog = ({ open, onClose, file, userId }: GenerateFileLinkDialogProps) => {
  const queryClient = useQueryClient();

  // Form States
  const [linkTier, setLinkTier] = useState('OneHour');
  const [customShortCode, setCustomShortCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [siteName, setSiteName] = useState('');
  const [themeColor, setThemeColor] = useState('');
  
  // Result States
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Reset form when file changes or dialog opens/closes
  useEffect(() => {
    if (open && file) {
      setLinkTier('OneHour');
      setCustomShortCode('');
      setTitle(file.fileName || file.blobName || '');
      setDescription('');
      setIconUrl('');
      setImageUrl('');
      setSiteName('');
      setThemeColor('');
      setGeneratedLink(null);
      setCopied(false);
    }
  }, [open, file]);

  const generateLinkMutation = useMutation({
    mutationFn: () =>
      generateFileLink(
        file.id, 
        linkTier, 
        userId, 
        customShortCode, 
        title, 
        description, 
        iconUrl, 
        imageUrl, 
        siteName, 
        themeColor
      ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      const link = `${window.location.host}/${data.shortCode}`;
      setGeneratedLink(link);
      
      // Auto-copy to clipboard
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth 
      PaperProps={{ className: 'glass-card' }}
    >
      <DialogTitle>Generate Short Link for {file?.fileName || file?.blobName}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Link Expiry (Tier)</InputLabel>
            <Select
              value={linkTier}
              label="Link Expiry (Tier)"
              onChange={(e) => setLinkTier(e.target.value)}
              disabled={!!generatedLink}
            >
              <MenuItem value="OneHour">1 Hour</MenuItem>
              <MenuItem value="SixHours">6 Hours</MenuItem>
              <MenuItem value="OneDay">1 Day</MenuItem>
              <MenuItem value="SevenDays">7 Days</MenuItem>
              <MenuItem value="Permanent">Permanent</MenuItem>
            </Select>
          </FormControl>

          <Accordion 
            disabled={!!generatedLink}
            sx={{ bgcolor: 'transparent', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info fontSize="small" /> Customize Metadata & Short Code
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Custom Short Code"
                  size="small"
                  fullWidth
                  value={customShortCode}
                  onChange={(e) => setCustomShortCode(e.target.value)}
                  placeholder="my-file-link"
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField label="Title" size="small" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <TextField label="Site Name" size="small" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </Box>
                <TextField
                  label="Description"
                  size="small"
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField label="Icon URL" size="small" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} />
                  <TextField label="Image URL" size="small" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                </Box>
                <TextField label="Theme Color" size="small" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#ff0000" />
              </Box>
            </AccordionDetails>
          </Accordion>
          
          {generatedLink && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'rgba(0,194,255,0.05)', 
              borderRadius: 1, 
              border: '1px solid rgba(0,194,255,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                SHORT LINK GENERATED SUCCESSFULLY
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', flexGrow: 1, wordBreak: 'break-all' }}>{generatedLink}</Typography>
                <Tooltip 
                  title={copied ? "Copied!" : "Copy link"} 
                  open={showTooltip || copied} 
                  onOpen={() => setShowTooltip(true)}
                  onClose={() => setShowTooltip(false)}
                  placement="top" 
                  arrow
                >
                  <IconButton size="small" onClick={handleCopyLink} color={copied ? "success" : "primary"}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {copied && (
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                  Copied Successfully!
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{generatedLink ? "Close" : "Cancel"}</Button>
        {!generatedLink && (
          <Button
            variant="contained"
            onClick={() => generateLinkMutation.mutate()}
            disabled={generateLinkMutation.isPending}
            startIcon={generateLinkMutation.isPending ? <CircularProgress size={20} /> : <AddLink />}
          >
            {generateLinkMutation.isPending ? 'Generating...' : 'Generate link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
