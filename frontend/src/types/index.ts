export interface Ortomat {
  id: string;
  name: string;
  address: string;
  totalCells: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  size?: string;
  price: number;
  imageUrl?: string;
  videoUrl?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  role: 'admin' | 'doctor' | 'courier';
}

export interface Order {
  id: string;
  orderNumber: string;
  ortomatId: string;
  cellNumber: number;
  productId: string;
  doctorId?: string;
  customerPhone?: string;
  amount: number;
  commission?: number;
  status: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  createdAt: string;
  completedAt?: string;
}