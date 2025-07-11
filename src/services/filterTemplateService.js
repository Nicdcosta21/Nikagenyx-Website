import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/filter-templates';

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

export const getFilterTemplates = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Error fetching filter templates:', error);
    throw error;
  }
};

export const saveFilterTemplate = async (template) => {
  try {
    const response = await api.post('/', template);
    return response.data;
  } catch (error) {
    console.error('Error saving filter template:', error);
    throw error;
  }
};

export const updateFilterTemplate = async (id, template) => {
  try {
    const response = await api.put(`/${id}`, template);
    return response.data;
  } catch (error) {
    console.error('Error updating filter template:', error);
    throw error;
  }
};

export const deleteFilterTemplate = async (id) => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error('Error deleting filter template:', error);
    throw error;
  }
};
