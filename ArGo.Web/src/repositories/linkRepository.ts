import apiClient from '../utils/apiClient';

export const shortenUrl = async (
  longUrl: string, 
  createdBy: string, 
  customShortCode?: string, 
  title?: string, 
  description?: string, 
  iconUrl?: string, 
  imageUrl?: string, 
  siteName?: string, 
  themeColor?: string
) => {
  const response = await apiClient.post('shorten', { 
    longUrl, 
    createdBy, 
    customShortCode, 
    title, 
    description, 
    iconUrl, 
    imageUrl, 
    siteName, 
    themeColor 
  });
  return response.data;
};

export const deleteLink = async (shortCode: string, userId: string) => {
  const response = await apiClient.delete(`links/${shortCode}?userId=${userId}`);
  return response.data;
};

export const fetchMetadata = async (url: string) => {
  const response = await apiClient.get(`metadata?url=${encodeURIComponent(url)}`);
  return response.data;
};

export const generateFileLink = async (
  fileId: string, 
  linkTier: string, 
  createdBy: string, 
  customShortCode?: string, 
  title?: string, 
  description?: string, 
  iconUrl?: string, 
  imageUrl?: string, 
  siteName?: string, 
  themeColor?: string
) => {
  const response = await apiClient.post(`files/${fileId}/links`, { 
    linkTier, 
    createdBy, 
    customShortCode, 
    title, 
    description, 
    iconUrl, 
    imageUrl, 
    siteName, 
    themeColor 
  });
  return response.data;
};
