import { useState } from 'react';
import { Box, Button, Typography, Alert, MenuItem, Select, FormControl, InputLabel, Fade, LinearProgress, TextField, Accordion, AccordionSummary, AccordionDetails, Avatar, Paper, CircularProgress, Tooltip } from '@mui/material';
import { CloudUpload, ContentCopy, ExpandMore, Info, Link as LinkIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '../repositories/fileRepository';
import { generateFileLink } from '../repositories/linkRepository';

const storageTiers = [
  { value: 'OneHour', label: '1 Hour' },
  { value: 'OneDay', label: '1 Day' },
  { value: 'ThreeDays', label: '3 Days' },
  { value: 'OneWeek', label: '1 Week' },
  { value: 'OneMonth', label: '1 Month' },
  { value: 'ThreeMonths', label: '3 Months' },
];

const linkTiers = [
  { value: 'FifteenMinutes', label: '15 Minutes' },
  { value: 'OneHour', label: '1 Hour' },
  { value: 'OneDay', label: '1 Day' },
];

import { useAuth } from '../context/AuthContext';

export const FileDrop = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [storageTier, setStorageTier] = useState('OneDay');
  const [linkTier, setLinkTier] = useState('OneHour');
  const [customShortCode, setCustomShortCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [siteName, setSiteName] = useState('');
  const [themeColor, setThemeColor] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [newLinkTier, setNewLinkTier] = useState('OneHour');
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => uploadFile(file!, storageTier, linkTier, user?.email || 'anonymous', customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor),
    onSuccess: (data) => {
      const link = `${window.location.host}/${data.shortCode}`;
      setUploadResult({
        fileId: data.fileId,
        storageExpiresAt: data.storageExpiresAt,
        shortCode: data.shortCode,
        linkExpiresAt: data.linkExpiresAt
      });
      queryClient.invalidateQueries({ queryKey: ['myItems'] });

      // Auto-copy to clipboard
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: (tier: string) => generateFileLink(uploadResult.fileId, tier, user?.email || 'anonymous', customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor),
    onSuccess: (data: any) => {
      const link = `${window.location.host}/${data.shortCode}`;
      setUploadResult({
        ...uploadResult,
        shortCode: data.shortCode,
        linkExpiresAt: data.linkExpiresAt
      });
      queryClient.invalidateQueries({ queryKey: ['myItems'] });

      // Auto-copy to clipboard
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setTitle(event.target.files[0].name);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (file) mutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Upload & Share Files</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Ephemeral file storage with customizable preview links.</Typography>

      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
            transition: 'border-color 0.3s',
            '&:hover': { borderColor: 'primary.main' }
          }}
        >
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="raised-button-file"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="raised-button-file">
            <Button variant="outlined" component="span" startIcon={<CloudUpload />} sx={{ mb: 2 }}>
              {file ? 'Change File' : 'Select File'}
            </Button>
          </label>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</Typography>
          )}
        </Box>

        <Accordion sx={{ bgcolor: 'transparent', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info fontSize="small" /> Customize Metadata & Tiers
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Keep File For</InputLabel>
                  <Select value={storageTier} label="Keep File For" onChange={(e) => setStorageTier(e.target.value)}>
                    {storageTiers.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Link Expiry</InputLabel>
                  <Select value={linkTier} label="Link Expiry" onChange={(e) => setLinkTier(e.target.value)}>
                    {linkTiers.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Custom Short Code"
                size="small"
                fullWidth
                value={customShortCode}
                onChange={(e) => setCustomShortCode(e.target.value)}
                placeholder="my-cool-file"
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

        {(title || iconUrl || imageUrl || description) && (
          <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start', bgcolor: 'rgba(255,255,255,0.05)', borderLeft: themeColor ? `4px solid ${themeColor}` : 'none' }}>
            {iconUrl && <Avatar src={iconUrl} variant="rounded" sx={{ width: 40, height: 40, mt: 0.5 }} />}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 'bold' }}>{siteName || 'File Preview'}</Typography>
              <Typography variant="subtitle2" sx={{ textAlign: 'left', fontWeight: 'bold' }}>{title || file?.name || 'Untitled File'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {description || 'No description available.'}
              </Typography>
            </Box>
            {imageUrl && <img src={imageUrl} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} alt="Preview" />}
          </Paper>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!file || mutation.isPending}
          onClick={handleUpload}
          startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
          sx={{ py: 1.5 }}
        >
          {mutation.isPending ? 'Uploading...' : 'Upload & Generate Link'}
        </Button>
      </Box>

      {mutation.isPending && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Upload failed. {(mutation.error as any).response?.data || 'Please try again.'}</Alert>
      )}

      {uploadResult && (
        <Fade in={!!uploadResult}>
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>Upload Successful!</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Storage Expires At</Typography>
                <Typography variant="body2">{new Date(uploadResult.storageExpiresAt).toLocaleString()}</Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Active Share Link</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ flexGrow: 1, wordBreak: 'break-all' }}>{window.location.host}/{uploadResult.shortCode}</Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy link"} open={copied || undefined} placement="top" arrow>
                    <Button 
                      size="small" 
                      onClick={() => copyToClipboard(`${window.location.host}/${uploadResult.shortCode}`)} 
                      startIcon={<ContentCopy />}
                      color={copied ? "success" : "primary"}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                  Expires: {new Date(uploadResult.linkExpiresAt).toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>New Link Expiry</InputLabel>
                  <Select value={newLinkTier} label="New Link Expiry" onChange={(e) => setNewLinkTier(e.target.value)}>
                    {linkTiers.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={() => generateLinkMutation.mutate(newLinkTier)}
                  disabled={generateLinkMutation.isPending}
                  startIcon={generateLinkMutation.isPending ? <CircularProgress size={16} /> : <LinkIcon />}
                >
                  New Link
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  );
};
