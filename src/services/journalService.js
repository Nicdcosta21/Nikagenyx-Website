import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/journal';

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

// Get all journal entries with optional filters
export const fetchJournalEntries = async (params) => {
  try {
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    throw error;
  }
};

// Get journal entry by ID
export const getJournalEntryById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching journal entry ${id}:`, error);
    throw error;
  }
};

// Create a new journal entry
export const createJournalEntry = async (journalData) => {
  try {
    const response = await api.post('/create', journalData);
    return response.data;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
};

// Update an existing journal entry
export const updateJournalEntry = async (id, journalData) => {
  try {
    const response = await api.put(`/${id}`, journalData);
    return response.data;
  } catch (error) {
    console.error(`Error updating journal entry ${id}:`, error);
    throw error;
  }
};

// Delete a journal entry
export const deleteJournalEntry = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting journal entry ${id}:`, error);
    throw error;
  }
};
