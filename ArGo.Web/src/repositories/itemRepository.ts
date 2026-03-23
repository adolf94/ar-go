import apiClient from '../utils/apiClient';

export const getMyItems = async (userId: string) => {
  const response = await apiClient.get(`my-items?userId=${userId}`);
  return response.data;
};
