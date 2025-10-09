// ✅ БЕЗ /api в кінці
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // ✅ endpoint вже містить /api (наприклад: /api/ortomats)
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('API Request:', url); // Для дебагу
    
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('token') 
      : null;

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

  async createOrtomat(data: any) {
    return this.request('/api/ortomats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrtomat(id: string, data: any) {
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

  // ==================== PRODUCTS ====================
  
  async getProducts() {
    return this.request('/api/products');
  }

  async getProduct(id: string) {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
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

  async handlePaymentCallback(data: any) {
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

  // ==================== AUTH ====================
  
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request('/api/auth/profile');
  }

  // ==================== USERS ====================
  
  async getUsers() {
    return this.request('/api/users');
  }

  async getDoctors() {
    return this.request('/api/users/doctors');
  }

  async getCouriers() {
    return this.request('/api/users/couriers');
  }

  async updateUser(id: string, data: any) {
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
}

export const api = new ApiClient();