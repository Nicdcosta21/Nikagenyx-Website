import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/dashboard';

const api = axios.create({
  baseURL: API_BASE_URL
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

export const getDashboardData = async (timeRange = 'month') => {
  try {
    const response = await api.get('/metrics', {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export const getDashboardLayout = async () => {
  try {
    const response = await api.get('/layout');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    throw error;
  }
};

export const saveDashboardLayout = async (layout) => {
  try {
    const response = await api.post('/layout', layout);
    return response.data;
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    throw error;
  }
};

export const getMetricHistory = async (metricName, timeRange = 'month') => {
  try {
    const response = await api.get(`/metrics/${metricName}/history`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching metric history:', error);
    throw error;
  }
};
