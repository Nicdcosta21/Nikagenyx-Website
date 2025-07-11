import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/tax';

// Add auth token to all requests
const api = axios.create({
  baseURL: API_BASE_URL
});

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

// GST Related API Calls
export const fetchGstReturns = async (params) => {
  try {
    const response = await api.get('/gst/returns', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching GST returns:', error);
    throw error;
  }
};

export const fetchGstr1Data = async (params) => {
  try {
    const response = await api.get('/gst/gstr1', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching GSTR-1 data:', error);
    throw error;
  }
};

export const generateGstr1 = async (params) => {
  try {
    const response = await api.get('/gst/gstr1/generate', { params });
    return response.data;
  } catch (error) {
    console.error('Error generating GSTR-1:', error);
    throw error;
  }
};

export const saveGstr1 = async (data) => {
  try {
    const response = await api.post('/gst/gstr1', data);
    return response.data;
  } catch (error) {
    console.error('Error saving GSTR-1:', error);
    throw error;
  }
};

export const fetchGstr3bData = async (params) => {
  try {
    const response = await api.get('/gst/gstr3b', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching GSTR-3B data:', error);
    throw error;
  }
};

export const generateGstr3b = async (params) => {
  try {
    const response = await api.get('/gst/gstr3b/generate', { params });
    return response.data;
  } catch (error) {
    console.error('Error generating GSTR-3B:', error);
    throw error;
  }
};

export const saveGstr3b = async (data) => {
  try {
    const response = await api.post('/gst/gstr3b', data);
    return response.data;
  } catch (error) {
    console.error('Error saving GSTR-3B:', error);
    throw error;
  }
};

// TDS Related API Calls
export const fetchTdsReturns = async (params) => {
  try {
    const response = await api.get('/tds/returns', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching TDS returns:', error);
    throw error;
  }
};

export const fetchTdsReturn = async (id) => {
  try {
    const response = await api.get(`/tds/returns/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching TDS return ${id}:`, error);
    throw error;
  }
};

export const generateTdsReturn = async (params) => {
  try {
    const response = await api.get('/tds/returns/generate', { params });
    return response.data;
  } catch (error) {
    console.error('Error generating TDS return:', error);
    throw error;
  }
};

export const saveTdsReturn = async (data) => {
  try {
    const response = data.id 
      ? await api.put(`/tds/returns/${data.id}`, data) 
      : await api.post('/tds/returns', data);
    return response.data;
  } catch (error) {
    console.error('Error saving TDS return:', error);
    throw error;
  }
};

// Dashboard Data
export const fetchTaxSummary = async () => {
  try {
    const response = await api.get('/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    throw error;
  }
};

export const fetchTaxDue = async () => {
  try {
    const response = await api.get('/due');
    return response.data;
  } catch (error) {
    console.error('Error fetching tax due dates:', error);
    throw error;
  }
};

export const fetchTaxCalendar = async (month, year) => {
  try {
    const response = await api.get('/calendar', { params: { month, year } });
    return response.data;
  } catch (error) {
    console.error('Error fetching tax calendar:', error);
    throw error;
  }
};

// Tax Settings
export const fetchTaxSettings = async () => {
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching tax settings:', error);
    throw error;
  }
};

export const saveTaxSettings = async (settings) => {
  try {
    const response = await api.post('/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error saving tax settings:', error);
    throw error;
  }
};
