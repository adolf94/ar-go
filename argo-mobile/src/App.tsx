import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { Filesystem } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import axios from 'axios';
import { config } from './config';
import './App.css';

function App() {
  const { user, login, logout, isAuthenticated, isLoading, accessToken, error, clearError } = useAuth();
  const [status, setStatus] = useState<string>('Ready for action...');
  const [lastShortCode, setLastShortCode] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Robust conversion to avoid data corruption
  const base64ToBlob = (base64: string, mime: string): Blob => {
    try {
      // Support potentially malformed base64 if it has line breaks (rare but happens in some buffers)
      const cleanBase64 = base64.replace(/\s/g, '');
      const byteCharacters = atob(cleanBase64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([byteArray], { type: mime });
    } catch (err) {
      console.error('[Base64ToBlob] Conversion error:', err);
      // Fallback: create an empty blob or rethrow
      throw new Error(`Failed to decode shared data: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const shortenLink = async (longUrl: string) => {
    if (!isAuthenticated || !accessToken) return;
    try {
      setIsUploading(true);
      setLastShortCode(null);
      setStatus(`Shortening link...`);

      const res = await axios.post(`${config.api}/shorten`, { longUrl }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      setLastShortCode(res.data.shortCode);
      setStatus(`Success! Link shortened.`);
      setManualUrl('');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${axios.isAxiosError(err) ? err.response?.data?.message || err.message : (err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    if (!isAuthenticated || !accessToken) return;
    try {
      setIsUploading(true);
      setLastShortCode(null);
      setStatus(`Uploading: ${fileName}...`);
      
      const formData = new FormData();
      formData.append('file', file, fileName);
      
      const url = `${config.api}/upload?fileName=${encodeURIComponent(fileName)}`;
      
      const res = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      setLastShortCode(res.data.shortCode);
      setStatus(`Success! '${fileName}' is now in the vault.`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${axios.isAxiosError(err) ? err.response?.data?.message || err.message : (err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopy = async () => {
    if (lastShortCode) {
      const fullUrl = `https://go.adolfrey.com/${lastShortCode}`;
      await Clipboard.write({ string: fullUrl });
      setStatus('URL copied to clipboard!');
    }
  };

  const handleManualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[ManualFile] File selected:', file?.name, file?.type, file?.size);
    
    if (file) {
      try {
        setStatus(`Preparing to lift '${file.name}'...`);
        
        // Use FileReader for maximum compatibility with older mobile WebViews
        const safeBlob = await new Promise<Blob>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(new Blob([reader.result], { type: file.type || 'application/octet-stream' }));
            } else {
              reject(new Error('Failed to read file as ArrayBuffer'));
            }
          };
          reader.onerror = () => reject(reader.error || new Error('Unknown error reading file'));
          reader.readAsArrayBuffer(file);
        });

        await uploadFile(safeBlob, file.name);
        
        // Reset the input value so the same file can be selected again
        if (e.target) e.target.value = '';
      } catch (err) {
        console.error('[ManualFile] Read error:', err);
        setStatus(`Error reading file: ${(err as Error).message}`);
      }
    }
  };

  useEffect(() => {
    const handleShare = async (e: any) => {
      console.log('[Share] Received event:', e);

      const sharedData = e.detail || (window as any)._lastShare;
      if (!sharedData) return;

      console.log('[Share] Found payload:', sharedData);
      (window as any)._lastShare = null;

      if (!isAuthenticated || !accessToken) {
        setStatus('Received share, but you are not logged in!');
        return;
      }

      if (sharedData.text) {
        await shortenLink(sharedData.text);
      } else if (sharedData.url) {
        try {
          setIsUploading(true);
          const name = sharedData.fileName || 'shared_file';
          setStatus(`Reading: ${name}...`);
          const fileData = await Filesystem.readFile({ path: sharedData.url });
          let blob: Blob;
          
          if (typeof fileData.data === 'string') {
            blob = base64ToBlob(fileData.data, sharedData.mimeType || 'application/octet-stream');
          } else {
            console.log('[Share] Received direct Blob, detaching...');
            // Even if it's already a blob, we detach it just to be safe
            blob = new Blob([await fileData.data.arrayBuffer()], { type: sharedData.mimeType || fileData.data.type || 'application/octet-stream' });
          }
          await uploadFile(blob, name);
        } catch (err) {
          console.error('[Share] Read error:', err);
          setStatus(`Error reading file: ${(err as Error).message}`);
          setIsUploading(false);
        }
      }
    };

    const checkPendingShare = () => {
      const pendingData = (window as any)._lastShare;
      if (pendingData) {
        console.log('[Share] Found pending share data, processing...');
        handleShare({ detail: pendingData });
      }
    };

    window.addEventListener('appShareReceived', handleShare);
    
    // Check if there was a share event that happened before we were ready
    if (!isLoading && isAuthenticated) {
      checkPendingShare();
    }

    return () => window.removeEventListener('appShareReceived', handleShare);
  }, [isAuthenticated, accessToken, isLoading]); // Added isLoading to dependencies

  if (isLoading) {
    return <div className="app-container"><div className="loader"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container login-container">
        <div className="glass-card">
          <h1>ArGo</h1>
          <p>Sign in to your private vault.</p>
          {error && (
            <div className="error-box" onClick={() => clearError()}>
              <p>{error}</p>
              <small>(tap to dismiss)</small>
            </div>
          )}
          <button onClick={() => login()} className="btn-primary">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header glass-card">
        <h1>ArGo Vault</h1>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <button onClick={() => logout()} className="btn-secondary">Log Out</button>
        </div>
      </header>

      <main className="main-content">
        <div className={`glass-card status-card ${isUploading ? 'pulse' : ''} ${lastShortCode ? 'success-glow' : ''}`}>
          <h2>{isUploading ? 'Working...' : 'ArGo Ready'}</h2>
          <p className="status-text">{status}</p>
          {lastShortCode && (
            <div className="success-actions">
              <span className="short-url">go.adolfrey.com/{lastShortCode}</span>
              <button onClick={handleCopy} className="btn-copy">Copy Link</button>
            </div>
          )}
        </div>

        <section className="quick-actions">
          <div className="glass-card action-card">
            <h3>Shorten Link</h3>
            <div className="input-group">
              <input
                type="text"
                placeholder="Paste long URL here..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                disabled={isUploading}
              />
              <button
                onClick={() => shortenLink(manualUrl)}
                disabled={!manualUrl || isUploading}
                className="btn-icon"
              >
                Go
              </button>
            </div>
          </div>

          <div className="glass-card action-card upload-zone" onClick={() => fileInputRef.current?.click()}>
            <h3>Upload File</h3>
            <p>Tap here to browse files</p>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleManualFile}
            />
          </div>
        </section>

        <div className="glass-card instructions">
          <p>
            <strong>Tip:</strong> You can also share photos or links directly from other apps using the Android
            <strong> Share</strong> button and picking <strong>ArGo</strong>!
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
