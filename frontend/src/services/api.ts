import axios from 'axios';
import { auth } from '../config/firebase';

/**
 * IMPORTANT:
 * For Expo Go on a REAL Android phone, you MUST set:
 *
 * EXPO_PUBLIC_BACKEND_URL=http://YOUR_PC_IP:8000
 */

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!API_URL) {
  throw new Error(
    'EXPO_PUBLIC_BACKEND_URL is not set. Add it to .env (e.g. http://192.168.1.5:8000)'
  );
}

// Remove trailing slash if any
const BASE_URL = API_URL.replace(/\/$/, '');

console.log('API_URL USED:', `${BASE_URL}/api`);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ===========================
   INTERCEPTORS
=========================== */
api.interceptors.request.use(async (config) => {
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      console.error(`🚨 API Error [${err.response.status}]:`, err.response.data);
    } else {
      console.error('🚨 Network Error');
    }
    return Promise.reject(err);
  }
);

/* ===========================
   Citizen APIs (IMPLEMENTED)
=========================== */
export const citizenAPI = {
  getProfile: () => api.get('/citizen/profile'),
  // updateProfile: (data: any) => api.put('/citizen/profile', data), // ❌ not implemented
};

/* ===========================
  Bills APIs (PARTIALLY IMPLEMENTED)
=========================== */
export const billsAPI = {
  getAll: () => api.get('/bills'),
  getPending: () => api.get('/bills/pending'),
  // getById: (id: string) => api.get(`/bills/${id}`),
  // getBySection: (serviceType: string) =>
  //   api.get(`/bills/section/${serviceType}`),
};

/* ===========================
   Payments APIs (PARTIALLY IMPLEMENTED)
=========================== */
export const paymentsAPI = {
  create: (data: { bill_id: string; payment_method: string }) =>
    api.post('/payments', data),
  // getHistory: () => api.get('/payments'),                // ❌ not implemented
  // getReceipt: (id: string) => api.get(`/payments/${id}`) // ❌ not implemented
};

/* ===========================
   Service Requests APIs (NOT IMPLEMENTED)
=========================== */
// export const serviceRequestsAPI = {
//   create: (data: any) => api.post('/service-requests', data),
//   getAll: () => api.get('/service-requests'),
//   getById: (id: string) => api.get(`/service-requests/${id}`),
// };

/* ===========================
   Complaints APIs (PARTIALLY IMPLEMENTED)
=========================== */
export const complaintsAPI = {
  create: (data: any) => api.post('/complaints', data),
  getAll: () => api.get('/complaints'),
  // getById: (id: string) => api.get(`/complaints/${id}`),
};

/* ===========================
  Notifications APIs (NOT IMPLEMENTED)
=========================== */
// export const notificationsAPI = {
//   getAll: () => api.get('/notifications'),
//   markRead: (id: string) => api.put(`/notifications/${id}/read`),
// };

/* ===========================
  Announcements APIs (NOT IMPLEMENTED)
=========================== */
export const announcementsAPI = {
  getAll: async () => ({ data: [] as any[] }),
};

/* ===========================
   Admin APIs (PARTIALLY IMPLEMENTED)
=========================== */
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),

  // getCitizens: () => api.get('/admin/citizens'),                 // ❌ not implemented
  // getBills: () => api.get('/admin/bills'),
  // createBill: (data: any) => api.post('/admin/bills', data),
  // generateSectionBills: (data: any) =>
  //   api.post('/admin/bills/generate-section', data),

  // getComplaints: () => api.get('/admin/complaints'),
  // updateComplaint: (id: string, data: any) =>
  //   api.put(`/admin/complaints/${id}`, data),

  // getServiceRequests: () => api.get('/admin/service-requests'),
  // updateServiceRequest: (id: string, data: any) =>
  //   api.put(`/admin/service-requests/${id}`, data),

  // getAnnouncements: () => api.get('/admin/announcements'),
  // createAnnouncement: (data: any) =>
  //   api.post('/admin/announcements', data),
  // deleteAnnouncement: (id: string) =>
  //   api.delete(`/admin/announcements/${id}`),
};

export default api;
