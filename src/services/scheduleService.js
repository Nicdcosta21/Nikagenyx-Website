import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api';

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

export const getSchedules = async (params = {}) => {
  try {
    const response = await api.get('/schedules', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
};

export const getSchedule = async (id) => {
  try {
    const response = await api.get(`/schedules/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
};

export const createSchedule = async (data) => {
  try {
    const response = await api.post('/schedules', data);
    return response.data;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (id, data) => {
  try {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (id) => {
  try {
    await api.delete(`/schedules/${id}`);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

export const getScheduleRuns = async (params = {}) => {
  try {
    const response = await api.get('/schedule-runs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule runs:', error);
    throw error;
  }
};

export const getScheduleTemplates = async () => {
  try {
    const response = await api.get('/schedule-templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule templates:', error);
    throw error;
  }
};

export const createScheduleTemplate = async (data) => {
  try {
    const response = await api.post('/schedule-templates', data);
    return response.data;
  } catch (error) {
    console.error('Error creating schedule template:', error);
    throw error;
  }
};

export const updateScheduleTemplate = async (id, data) => {
  try {
    const response = await api.put(`/schedule-templates/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating schedule template:', error);
    throw error;
  }
};

export const deleteScheduleTemplate = async (id) => {
  try {
    await api.delete(`/schedule-templates/${id}`);
  } catch (error) {
    console.error('Error deleting schedule template:', error);
    throw error;
  }
};

export const createBatchSchedules = async (data) => {
  try {
    const response = await api.post('/schedules/batch', data);
    return response.data;
  } catch (error) {
    console.error('Error creating batch schedules:', error);
    throw error;
  }
};
