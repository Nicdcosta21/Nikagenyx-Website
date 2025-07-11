import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/ledger';

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

// Get general ledger entries with optional filters
export const fetchLedgerEntries = async (params) => {
  try {
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    throw error;
  }
};

// Get account details
export const fetchAccountDetails = async (accountId) => {
  try {
    const response = await axios.get(`/api/accounts/${accountId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching account details ${accountId}:`, error);
    throw error;
  }
};

// Get ledger for a specific account
export const fetchAccountLedger = async (params) => {
  try {
    const response = await api.get('/account', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching account ledger:', error);
    throw error;
  }
};

// Get trial balance
export const fetchTrialBalance = async (params) => {
  try {
    const response = await api.get('/trial-balance', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    throw error;
  }
};
