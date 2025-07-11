import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/audit';

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

export const logAuditEvent = async (action, entityType, entityId, details = {}) => {
  try {
    const response = await api.post('/log', {
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
    return response.data;
  } catch (error) {
    console.error('Error logging audit event:', error);
    throw error;
  }
};

export const getAuditLogs = async (params = {}) => {
  try {
    const response = await api.get('/logs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const getEntityAuditLogs = async (entityType, entityId) => {
  try {
    const response = await api.get(`/logs/${entityType}/${entityId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    throw error;
  }
};

export const searchAuditLogs = async (searchParams) => {
  try {
    const response = await api.post('/logs/search', searchParams);
    return response.data;
  } catch (error) {
    console.error('Error searching audit logs:', error);
    throw error;
  }
};
