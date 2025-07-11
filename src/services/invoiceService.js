import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api/invoices';

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

// Get all invoices with optional filters
export const fetchInvoices = async (params) => {
  try {
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

// Get invoice by ID
export const getInvoiceById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoice ${id}:`, error);
    throw error;
  }
};

// Create a new invoice
export const createInvoice = async (invoiceData) => {
  try {
    const response = await api.post('/create', invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Update an existing invoice
export const updateInvoice = async (id, invoiceData) => {
  try {
    const response = await api.put(`/${id}`, invoiceData);
    return response.data;
  } catch (error) {
    console.error(`Error updating invoice ${id}:`, error);
    throw error;
  }
};

// Update invoice status
export const updateInvoiceStatus = async (id, status) => {
  try {
    const response = await api.put(`/${id}?action=update-status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating invoice status ${id}:`, error);
    throw error;
  }
};

// Delete an invoice
export const deleteInvoice = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting invoice ${id}:`, error);
    throw error;
  }
};

// Generate PDF
export const generatePdf = async (id) => {
  try {
    const response = await api.get(`/pdf?id=${id}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Error generating PDF for invoice ${id}:`, error);
    throw error;
  }
};

// Get invoice settings
export const getInvoiceSettings = async () => {
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    throw error;
  }
};

// Save invoice settings
export const saveInvoiceSettings = async (settings) => {
  try {
    const response = await api.post('/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error saving invoice settings:', error);
    throw error;
  }
};
