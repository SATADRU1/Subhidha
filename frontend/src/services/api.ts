import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  sendOTP: (mobile: string) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (data: { mobile: string; otp: string; name?: string; aadhaar_number?: string; language?: string }) =>
    api.post('/auth/verify-otp', data),
  adminLogin: (data: { username: string; password: string }) =>
    api.post('/auth/admin/login', data),
};

// Citizen APIs
export const citizenAPI = {
  getProfile: () => api.get('/citizen/profile'),
  updateProfile: (data: any) => api.put('/citizen/profile', data),
};

// Bills APIs
export const billsAPI = {
  getAll: () => api.get('/bills'),
  getPending: () => api.get('/bills/pending'),
  getById: (id: string) => api.get(`/bills/${id}`),
};

// Payments APIs
export const paymentsAPI = {
  create: (data: { bill_id: string; payment_method: string }) => api.post('/payments', data),
  getHistory: () => api.get('/payments'),
  getReceipt: (id: string) => api.get(`/payments/${id}/receipt`),
};

// Service Requests APIs
export const serviceRequestsAPI = {
  create: (data: any) => api.post('/service-requests', data),
  getAll: () => api.get('/service-requests'),
  getById: (id: string) => api.get(`/service-requests/${id}`),
};

// Complaints APIs
export const complaintsAPI = {
  create: (data: any) => api.post('/complaints', data),
  getAll: () => api.get('/complaints'),
  getById: (id: string) => api.get(`/complaints/${id}`),
};

// Notifications APIs
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};

// Announcements APIs
export const announcementsAPI = {
  getAll: () => api.get('/announcements'),
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCitizens: () => api.get('/admin/citizens'),
  getBills: () => api.get('/admin/bills'),
  createBill: (data: any) => api.post('/admin/bills', data),
  getComplaints: () => api.get('/admin/complaints'),
  updateComplaint: (id: string, data: any) => api.put(`/admin/complaints/${id}`, data),
  getServiceRequests: () => api.get('/admin/service-requests'),
  updateServiceRequest: (id: string, data: any) => api.put(`/admin/service-requests/${id}`, data),
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data: any) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id: string) => api.delete(`/admin/announcements/${id}`),
};

export default api;
