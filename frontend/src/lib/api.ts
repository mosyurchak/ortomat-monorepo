import type {
  CreateOrtomatDto,
  UpdateOrtomatDto,
  CreateProductDto,
  UpdateProductDto,
  CreateDoctorDto,
  UpdateDoctorDto,
  UpdateUserDto,
  RegisterDto,
  PaymentCallbackDto,
  BackupData,
} from '../types';

// ✅ БЕЗ /api в кінці
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Helper functions for token storage (supports both localStorage and sessionStorage)
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

function setToken(token: string) {
  if (typeof window === 'undefined') return;
  // Store in whichever storage currently has tokens (to maintain "remember me" preference)
  if (localStorage.getItem('token') || localStorage.getItem('refresh_token')) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.baseURL = API_URL;
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * ✅ SECURITY: Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Save new access token
      setToken(data.access_token);

      return data.access_token;
    } catch (error) {
      // Clear tokens on refresh failure
      clearTokens();
      throw error;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;

    console.log('API Request:', url);

    const token = getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // ✅ SECURITY: Handle 401 Unauthorized - token expired
      if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
        if (this.isRefreshing) {
          // Wait for the ongoing refresh to complete
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(() => {
            // Retry the original request with new token
            return this.request(endpoint, options);
          });
        }

        this.isRefreshing = true;

        try {
          const newToken = await this.refreshAccessToken();

          this.processQueue(null, newToken);
          this.isRefreshing = false;

          // Retry the original request with new token
          return this.request(endpoint, options);
        } catch (refreshError) {
          this.processQueue(refreshError as Error, null);
          this.isRefreshing = false;

          // Redirect to login on refresh failure
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }

          throw refreshError;
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText
        }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ==================== ORTOMATS ====================
  
  async getOrtomats() {
    return this.request('/api/ortomats');
  }

  async getOrtomat(id: string) {
    return this.request(`/api/ortomats/${id}`);
  }

  async getOrtomatCatalog(id: string, referralCode?: string) {
    const query = referralCode ? `?ref=${referralCode}` : '';
    return this.request(`/api/ortomats/${id}/catalog${query}`);
  }

  async getOrtomatInventory(id: string) {
    return this.request(`/api/ortomats/${id}/inventory`);
  }

  async createOrtomat(data: CreateOrtomatDto) {
    return this.request('/api/ortomats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrtomat(id: string, data: UpdateOrtomatDto) {
    return this.request(`/api/ortomats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOrtomat(id: string) {
    return this.request(`/api/ortomats/${id}`, {
      method: 'DELETE',
    });
  }

  async getDevicesStatus() {
    return this.request('/api/ortomats/devices/status');
  }

  async getDeviceStatus(deviceId: string) {
    return this.request(`/api/ortomats/devices/${deviceId}/status`);
  }

  async updateCellProduct(ortomatId: string, cellNumber: number, productId: string | null) {
    return this.request(`/api/ortomats/${ortomatId}/cells/${cellNumber}/product`, {
      method: 'PATCH',
      body: JSON.stringify({ productId }),
    });
  }

  async openCellForRefill(ortomatId: string, cellNumber: number, courierId: string) {
    return this.request(`/api/ortomats/${ortomatId}/cells/${cellNumber}/open-for-refill`, {
      method: 'POST',
      body: JSON.stringify({ courierId }),
    });
  }

  async markCellFilled(ortomatId: string, cellNumber: number, courierId: string) {
    return this.request(`/api/ortomats/${ortomatId}/cells/${cellNumber}/mark-filled`, {
      method: 'POST',
      body: JSON.stringify({ courierId }),
    });
  }

  // ==================== PRODUCTS ====================
  
  async getProducts() {
    return this.request('/api/products');
  }

  async getProduct(id: string) {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(data: CreateProductDto) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    return this.request(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== ORDERS ====================
  
  async createOrder(data: {
    productId: string;
    ortomatId: string;
    referralCode?: string;
    customerPhone?: string;
  }) {
    return this.request('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async processPayment(orderId: string) {
    return this.request(`/api/orders/${orderId}/pay`, {
      method: 'POST',
    });
  }

  async handlePaymentCallback(data: PaymentCallbackDto) {
    return this.request('/api/orders/callback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrder(id: string) {
    return this.request(`/api/orders/${id}`);
  }

  async openCell(orderId: string) {
    return this.request(`/api/orders/${orderId}/open-cell`, {
      method: 'POST',
    });
  }

  /**
   * Створення Monobank платежу
   * Викликається після створення замовлення
   * Повертає pageUrl для перенаправлення користувача
   */
  async createMonoPayment(orderId: string) {
    return this.request(`/api/orders/${orderId}/create-mono-payment`, {
      method: 'POST',
    });
  }

  /**
   * Перевірка статусу Monobank invoice
   */
  async getMonoInvoiceStatus(invoiceId: string) {
    return this.request(`/api/mono-payment/status/${invoiceId}`);
  }

  /**
   * Ручна перевірка статусу оплати (fallback якщо webhook не спрацював)
   */
  async checkPaymentStatus(orderId: string) {
    return this.request(`/api/orders/${orderId}/check-payment-status`, {
      method: 'POST',
    });
  }

  // ==================== AUTH ====================
  
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: RegisterDto) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request('/api/auth/profile');
  }

  async verifyEmail(token: string) {
    return this.request(`/api/auth/verify-email?token=${token}`);
  }

  async forgotPassword(email: string) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  /**
   * ✅ SECURITY: Logout - invalidate refresh token on server and clear local tokens
   */
  async logout() {
    try {
      // Call backend to invalidate refresh token
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local cleanup even if request fails
    } finally {
      // Clear tokens from both localStorage and sessionStorage
      clearTokens();
    }
  }

  /**
   * ✅ SECURITY: Manual refresh token (for use before token expires)
   */
  async refreshToken() {
    return this.refreshAccessToken();
  }

  // ==================== USERS ====================
  
  async getUsers() {
    return this.request('/api/users');
  }

  async getDoctors() {
    return this.request('/api/users/doctors');
  }

  async createDoctor(data: CreateDoctorDto) {
    return this.request('/api/users/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDoctor(id: string, data: UpdateDoctorDto) {
    return this.request(`/api/users/doctors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDoctor(id: string) {
    return this.request(`/api/users/doctors/${id}`, {
      method: 'DELETE',
    });
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return this.request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== SALES ====================
  
  async getDoctorStats(doctorId: string) {
    return this.request(`/api/sales/doctor/${doctorId}`);
  }

  async getAdminStats() {
    return this.request(`/api/sales/admin/stats`);
  }

  async getAllSales() {
    return this.request('/api/sales');
  }

  // ==================== QR CODE ====================
  
  async getDoctorQRCode(doctorId: string) {
    return this.request(`/api/qr-code/doctor/${doctorId}`);
  }

  // ==================== COURIER ====================
  
  async refillCell(ortomatId: string, cellNumber: number, data: {
    productId: string;
    courierId: string;
  }) {
    return this.request(`/api/ortomats/${ortomatId}/cells/${cellNumber}/refill`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== LOGS ====================
  
  async getLogs(filters?: {
    type?: string;
    category?: string;
    severity?: string;
    ortomatId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.ortomatId) params.append('ortomatId', filters.ortomatId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request(`/api/logs${query ? `?${query}` : ''}`);
  }

  async getLogsStats(filters?: {
    ortomatId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.ortomatId) params.append('ortomatId', filters.ortomatId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const query = params.toString();
    return this.request(`/api/logs/stats${query ? `?${query}` : ''}`);
  }

  async cleanOldLogs(days: number = 30) {
    return this.request(`/api/logs/clean?days=${days}`, {
      method: 'DELETE',
    });
  }

  // ==================== COURIER ====================
  
  async createCourier(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    ortomatIds?: string[];
  }) {
    return this.request('/api/courier', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCouriers() {
    return this.request('/api/courier');
  }

  async getCourier(id: string) {
    return this.request(`/api/courier/${id}`);
  }

  async updateCourier(id: string, data: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    phone?: string;
    ortomatIds?: string[];
  }) {
    return this.request(`/api/courier/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCourier(id: string) {
    return this.request(`/api/courier/${id}`, {
      method: 'DELETE',
    });
  }

  async getAvailableOrtomats() {
    return this.request('/api/courier/available/ortomats');
  }

  // ==================== ADMIN BACKUP ====================

  // Експорт даних - завантажує файл бекапу
  async exportBackup() {
    const url = `${this.baseURL}/api/admin/backup`;
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token')
      : null;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Помилка створення бекапу');
    }

    // Отримуємо blob та ім'я файлу з headers
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : 'ortomat-backup.json';

    return { blob, filename };
  }

  // Імпорт даних з файлу бекапу
  async importBackup(backupData: BackupData) {
    return this.request('/api/admin/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
  }
}

export const api = new ApiClient();
