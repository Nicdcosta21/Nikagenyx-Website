import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/accounts';

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

// Get all accounts
export const fetchAccounts = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

// Get account by ID
export const getAccountById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching account ${id}:`, error);
    throw error;
  }
};

// Create a new account
export const createAccount = async (accountData) => {
  try {
    const response = await api.post('/create', accountData);
    return response.data;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

// Update an existing account
export const updateAccount = async (id, accountData) => {
  try {
    const response = await api.put(`/${id}`, accountData);
    return response.data;
  } catch (error) {
    console.error(`Error updating account ${id}:`, error);
    throw error;
  }
};

// Delete an account
export const deleteAccount = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting account ${id}:`, error);
    throw error;
  }
};
