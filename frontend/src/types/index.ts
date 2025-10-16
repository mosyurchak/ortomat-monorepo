export interface Ortomat {
  id: string;
  name: string;
  address: string;
  city?: string; // ✅ ДОДАНО
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
  
  // ✅ ДОДАНО: Нові поля для карточки товару
  images?: string[]; // Масив URL зображень (до 6)
  color?: string;
  material?: string;
  manufacturer?: string;
  videoUrl?: string;
  termsAndConditions?: string;
  
  // Старе поле для зворотної сумісності
  imageUrl?: string;
  
  attributes?: any;
  
  // ✅ Додаткові поля які можуть прийти з API
  quantity?: number; // Для каталогу
  availableCells?: number[]; // Для каталогу
}

export interface Cell {
  id: string;
  number: number;
  ortomatId: string;
  productId?: string | null;
  isAvailable: boolean; // true = порожня (червона), false = заповнена (зелена)
  lastRefillDate?: string | null;
  courierId?: string | null;
  product?: Product | null;
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