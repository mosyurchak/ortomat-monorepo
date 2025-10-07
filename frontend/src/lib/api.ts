import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Додаємо токен до кожного запиту
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  console.log('🔑 Token from cookie:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN'); // DEBUG
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обробка помилок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data); // DEBUG
    if (error.response?.status === 401) {
      console.log('🚫 Unauthorized - clearing auth'); // DEBUG
      Cookies.remove('token');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
};

export const ortomatsApi = {
  getAll: () => api.get('/ortomats'),
  getOne: (id: string) => api.get(`/ortomats/${id}`),
  getCatalog: (id: string, referralCode?: string) => {
    const params = referralCode ? `?ref=${referralCode}` : '';
    return api.get(`/ortomats/${id}/catalog${params}`);
  },
  getByReferral: (code: string) => api.get(`/ortomats/by-referral?code=${code}`),
  create: (data: any) => api.post('/ortomats', data),
  update: (id: string, data: any) => api.patch(`/ortomats/${id}`, data),
  delete: (id: string) => api.delete(`/ortomats/${id}`),
  openCell: (id: string, cellNumber: number) => 
    api.post(`/ortomats/${id}/open-cell`, { cellNumber }),
  assignDoctor: (id: string, doctorId: string, commissionPercent?: number) =>
    api.post(`/ortomats/${id}/doctors`, { doctorId, commissionPercent }),
  assignCourier: (id: string, courierId: string) =>
    api.post(`/ortomats/${id}/couriers`, { courierId }),
};

export const productsApi = {
  getAll: () => api.get('/products'),
  getOne: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getProfile: () => api.get('/users/profile'),
  getOne: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getStats: (id: string) => api.get(`/users/${id}/stats`),
};

export const salesApi = {
  getAll: () => api.get('/sales'),
  purchase: (data: any) => api.post('/sales/purchase', data),
};

export const qrCodeApi = {
  generate: (referralCode: string) =>
    api.get(`/qr-code/generate?referralCode=${referralCode}`),
};

export const ordersApi = {
  create: (data: any) => api.post('/orders/create', data),
  pay: (orderId: string) => api.post(`/orders/${orderId}/pay`),
  callback: (data: any) => api.post('/orders/callback', data),
  getOne: (id: string) => api.get(`/orders/${id}`),
  getAll: () => api.get('/orders'),
};

export default api;