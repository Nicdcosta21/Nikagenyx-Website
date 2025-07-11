import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/attachments';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
api.interceptors.request.use(
  config => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export const uploadFile = async (file, entityType, entityId, metadata = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity_type', entityType);
  formData.append('entity_id', entityId);
  formData.append('metadata', JSON.stringify(metadata));

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const getAttachments = async (entityType, entityId) => {
  try {
    const response = await api.get(`/${entityType}/${entityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching attachments:', error);
    throw error;
  }
};

export const deleteAttachment = async (attachmentId) => {
  try {
    await api.delete(`/${attachmentId}`);
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
};

export const downloadAttachment = async (attachmentId) => {
  try {
    const response = await api.get(`/${attachmentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
};

export const updateAttachment = async (attachmentId, metadata) => {
  try {
    const response = await api.patch(`/${attachmentId}`, { metadata });
    return response.data;
  } catch (error) {
    console.error('Error updating attachment:', error);
    throw error;
  }
};
