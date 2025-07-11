import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/reports';

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

// Financial Statements
export const fetchBalanceSheet = async (params) => {
  try {
    const response = await api.get('/balance-sheet', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    throw error;
  }
};

export const fetchProfitLossStatement = async (params) => {
  try {
    const response = await api.get('/profit-loss', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching profit & loss statement:', error);
    throw error;
  }
};

export const fetchCashFlowStatement = async (params) => {
  try {
    const response = await api.get('/cash-flow', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching cash flow statement:', error);
    throw error;
  }
};

// Custom Reports
export const fetchSavedReports = async () => {
  try {
    const response = await api.get('/custom');
    return response.data;
  } catch (error) {
    console.error('Error fetching saved reports:', error);
    throw error;
  }
};

export const fetchCustomReport = async (id) => {
  try {
    const response = await api.get(`/custom/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching custom report:', error);
    throw error;
  }
};

export const buildCustomReport = async (config) => {
  try {
    const response = await api.post('/custom/build', config);
    return response.data;
  } catch (error) {
    console.error('Error building custom report:', error);
    throw error;
  }
};

export const saveCustomReport = async (config) => {
  try {
    const response = await api.post('/custom', config);
    return response.data;
  } catch (error) {
    console.error('Error saving custom report:', error);
    throw error;
  }
};

export const deleteCustomReport = async (id) => {
  try {
    await api.delete(`/custom/${id}`);
  } catch (error) {
    console.error('Error deleting custom report:', error);
    throw error;
  }
};

// Scheduled Reports
export const fetchScheduledReports = async () => {
  try {
    const response = await api.get('/scheduled');
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    throw error;
  }
};

export const fetchScheduledReport = async (id) => {
  try {
    const response = await api.get(`/scheduled/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    throw error;
  }
};

export const saveScheduledReport = async (data, id = null) => {
  try {
    const response = id
      ? await api.put(`/scheduled/${id}`, data)
      : await api.post('/scheduled', data);
    return response.data;
  } catch (error) {
    console.error('Error saving scheduled report:', error);
    throw error;
  }
};

export const deleteScheduledReport = async (id) => {
  try {
    await api.delete(`/scheduled/${id}`);
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    throw error;
  }
};

export const toggleReportStatus = async (id, active) => {
  try {
    const response = await api.patch(`/scheduled/${id}/status`, { active });
    return response.data;
  } catch (error) {
    console.error('Error toggling report status:', error);
    throw error;
  }
};

// Export Functions
export const exportBalanceSheet = async (format, asOfDate, compareDate = null) => {
  try {
    const response = await api.get('/export/balance-sheet', {
      params: { format, asOfDate, compareDate },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting balance sheet:', error);
    throw error;
  }
};

export const exportProfitLoss = async (format, dateRange, compareRange = null) => {
  try {
    const response = await api.get('/export/profit-loss', {
      params: { format, ...dateRange, ...compareRange },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting profit & loss statement:', error);
    throw error;
  }
};

export const exportCashFlow = async (format, dateRange, compareRange = null) => {
  try {
    const response = await api.get('/export/cash-flow', {
      params: { format, ...dateRange, ...compareRange },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting cash flow statement:', error);
    throw error;
  }
};

export const exportCustomReport = async (id, format) => {
  try {
    const response = await api.get(`/export/custom/${id}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting custom report:', error);
    throw error;
  }
};
