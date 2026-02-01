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
  
  attributes?: Record<string, unknown>;

  // Додаткові поля які можуть прийти з API
  quantity?: number;
  availableCells?: number[];
  sku?: string;
  referralPoints?: number;
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

// ✅ DTO інтерфейси для створення/оновлення

export interface CreateOrtomatDto {
  name: string;
  address: string;
  city?: string;
  totalCells?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateOrtomatDto extends Partial<CreateOrtomatDto> {}

export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  category: string;
  size?: string;
  price: number;
  mainImage?: string;
  images?: string[];
  videoUrl?: string;
  color?: string;
  material?: string;
  manufacturer?: string;
  country?: string;
  type?: string;
  sizeChartUrl?: string;
  termsAndConditions?: string;
  referralPoints?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface CreateDoctorDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  ortomatIds?: string[];
}

export interface UpdateDoctorDto extends Partial<CreateDoctorDto> {}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email: string;
  password: string;
  token?: string;
}

export interface PaymentCallbackDto {
  data: string;
  signature: string;
}

export interface BackupData {
  users?: User[];
  ortomats?: Ortomat[];
  products?: Product[];
  cells?: Cell[];
  [key: string]: unknown;
}

export interface DoctorOrtomat {
  id: string;
  doctorId: string;
  ortomatId: string;
  referralCode: string;
  qrCode?: string;
  totalPoints: number;
  totalSales: number;
  createdAt: string;
  ortomat?: Ortomat;
}

export interface ActivityLog {
  id: string;
  type: string;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  ortomatId?: string;
  cellNumber?: number;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  createdAt: string;
  user?: User;
  ortomat?: Ortomat;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}