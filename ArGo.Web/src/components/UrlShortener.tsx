import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert, Fade, Paper, Avatar, Accordion, AccordionSummary, AccordionDetails, Tooltip } from '@mui/material';
import { Link as LinkIcon, ContentCopy, ExpandMore, Info } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shortenUrl, fetchMetadata } from '../repositories/linkRepository';

import { useAuth } from '../context/AuthContext';

export const UrlShortener = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [fetchUrl, setFetchUrl] = useState('');
  const [customShortCode, setCustomShortCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [siteName, setSiteName] = useState('');
  const [themeColor, setThemeColor] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Use useQuery for metadata fetching with caching, triggered by fetchUrl
  const isValidUrl = fetchUrl && (fetchUrl.startsWith('http://') || fetchUrl.startsWith('https://'));
  const { data: extractedMetadata, isFetching: isFetchingMetadata } = useQuery({
    queryKey: ['urlMetadata', fetchUrl],
    queryFn: () => fetchMetadata(fetchUrl),
    enabled: !!isValidUrl,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  const handleUrlBlur = () => {
    if (url !== fetchUrl) {
      setFetchUrl(url);
    }
  };

  // Effect to sync extracted metadata with form states
  useEffect(() => {
    if (extractedMetadata) {
      if (extractedMetadata.title) setTitle(extractedMetadata.title);
      if (extractedMetadata.description) setDescription(extractedMetadata.description);
      if (extractedMetadata.iconUrl) setIconUrl(extractedMetadata.iconUrl);
      if (extractedMetadata.imageUrl) setImageUrl(extractedMetadata.imageUrl);
      if (extractedMetadata.siteName) setSiteName(extractedMetadata.siteName);
      if (extractedMetadata.themeColor) setThemeColor(extractedMetadata.themeColor);
    }
  }, [extractedMetadata]);

  const mutation = useMutation({
    mutationFn: (longUrl: string) => shortenUrl(longUrl, user?.email || 'anonymous', customShortCode, title, description, iconUrl, imageUrl, siteName, themeColor),
    onSuccess: (data: any) => {
      const link = `${window.location.host}/${data.shortCode}`;
      setResult(link);
      queryClient.invalidateQueries({ queryKey: ['myItems'] });

      // Auto-copy to clipboard
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const handleShorten = () => {
    if (url) mutation.mutate(url);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Shorten Long URLs</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Create persistent links with advanced metadata for better social sharing.</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <TextField
          fullWidth
          label="Enter long URL"
          variant="outlined"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://example.com/very/long/path"
          InputProps={{
            endAdornment: isFetchingMetadata ? <CircularProgress size={20} /> : null
          }}
        />

        {(title || iconUrl || imageUrl || description) && (
           <Paper sx={{ p: 2, mb: 1, display: 'flex', gap: 2, alignItems: 'flex-start', bgcolor: 'rgba(255,255,255,0.05)', borderLeft: themeColor ? `4px solid ${themeColor}` : 'none' }}>
             {iconUrl && <Avatar src={iconUrl} variant="rounded" sx={{ width: 40, height: 40, mt: 0.5 }} />}
             <Box sx={{ flexGrow: 1 }}>
               <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 'bold' }}>{siteName || 'Preview'}</Typography>
               <Typography variant="subtitle2" sx={{ textAlign: 'left', fontWeight: 'bold' }}>{title || 'No Title'}</Typography>
               <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left', mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                 {description || 'No description available.'}
               </Typography>
               <Typography variant="caption" color="text.disabled" sx={{ display: 'block', wordBreak: 'break-all', textAlign: 'left' }}>{url}</Typography>
             </Box>
             {imageUrl && <img src={imageUrl} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} alt="Preview" />}
           </Paper>
        )}

        <Accordion sx={{ bgcolor: 'transparent', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}>
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
                placeholder="my-cool-link"
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

        <Button
          variant="contained"
          size="large"
          onClick={handleShorten}
          disabled={mutation.isPending || !url}
          startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
          sx={{ py: 1.5, mt: 1 }}
        >
          {mutation.isPending ? 'Shortening...' : 'Shorten'}
        </Button>
      </Box>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Error shortening URL. {(mutation.error as any).response?.data || 'Please try again.'}</Alert>
      )}

      {result && (
        <Fade in={!!result}>
          <Box sx={{ mt: 2, p: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>Your short link is ready!</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ wordBreak: 'break-all', flexGrow: 1 }}>{result}</Typography>
              <Tooltip 
                title={copied ? "Copied!" : "Copy link"} 
                open={showTooltip || copied} 
                onOpen={() => setShowTooltip(true)}
                onClose={() => setShowTooltip(false)}
                placement="top" 
                arrow
              >
                <Button 
                  size="small" 
                  onClick={copyToClipboard} 
                  startIcon={<ContentCopy />}
                  color={copied ? "success" : "primary"}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  );
};
