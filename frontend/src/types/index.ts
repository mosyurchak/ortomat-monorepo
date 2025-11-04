export interface Ortomat {
  id: string;
  name: string;
  address: string;
  city?: string;
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
  
  // Зображення
  mainImage?: string;
  images?: string[];
  imageUrl?: string; // Для зворотної сумісності
  
  // Відео
  videoUrl?: string;
  
  // ✅ Характеристики (існуючі)
  color?: string;
  material?: string;
  manufacturer?: string;
  
  // ✅ Характеристики (нові)
  country?: string; // Країна виробника
  type?: string; // Тип товару
  sizeChartUrl?: string; // URL картинки таблиці розмірів
  
  // Умови
  termsAndConditions?: string; // Специфічні умови для товару
  
  attributes?: any;
  
  // Додаткові поля які можуть прийти з API
  quantity?: number;
  availableCells?: number[];
}

// ✅ НОВИЙ інтерфейс для глобальних налаштувань
export interface Settings {
  id: string;
  purchaseTerms: string; // Загальні умови покупки
  createdAt: string;
  updatedAt: string;
}

export interface Cell {
  id: string;
  number: number;
  ortomatId: string;
  productId?: string | null;
  isAvailable: boolean; // true = порожня (синя), false = заповнена (зелена)
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