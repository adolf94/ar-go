import apiClient from '../utils/apiClient';

export const uploadFile = async (
  file: File, 
  storageTier: string, 
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
  let url = `upload?storageTier=${storageTier}&linkTier=${linkTier}&createdBy=${createdBy}&fileName=${encodeURIComponent(file.name)}`;
  
  if (customShortCode) url += `&customShortCode=${encodeURIComponent(customShortCode)}`;
  if (title) url += `&title=${encodeURIComponent(title)}`;
  if (description) url += `&description=${encodeURIComponent(description)}`;
  if (iconUrl) url += `&iconUrl=${encodeURIComponent(iconUrl)}`;
  if (imageUrl) url += `&imageUrl=${encodeURIComponent(imageUrl)}`;
  if (siteName) url += `&siteName=${encodeURIComponent(siteName)}`;
  if (themeColor) url += `&themeColor=${encodeURIComponent(themeColor)}`;

  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(url, formData);
  return response.data;
};
