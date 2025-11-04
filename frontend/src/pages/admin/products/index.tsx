// frontend/src/pages/admin/products/index.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  size: string;
  price: number;
  mainImage?: string;
  images?: string[];
  videoUrl?: string;
  // Характеристики
  manufacturer?: string;
  country?: string;
  material?: string;
  color?: string;
  type?: string;
  sizeChartUrl?: string;
}

export default function AdminProducts() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    size: 'Uni',
    price: 0,
    mainImage: '',
    images: ['', '', '', ''],
    videoUrl: '',
    manufacturer: '',
    country: '',
    material: '',
    color: '',
    type: '',
    sizeChartUrl: '',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/products`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowModal(false);
      resetForm();
      alert('✅ Товар успішно створено!');
    },
    onError: (error: any) => {
      alert('❌ Помилка: ' + (error.response?.data?.message || error.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/products/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      alert('✅ Товар успішно оновлено!');
    },
    onError: (error: any) => {
      alert('❌ Помилка: ' + (error.response?.data?.message || error.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      alert('✅ Товар видалено!');
    },
    onError: (error: any) => {
      alert('❌ Помилка: ' + (error.response?.data?.message || error.message));
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      size: 'Uni',
      price: 0,
      mainImage: '',
      images: ['', '', '', ''],
      videoUrl: '',
      manufacturer: '',
      country: '',
      material: '',
      color: '',
      type: '',
      sizeChartUrl: '',
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      images: [
        ...(product.images || []),
        ...Array(4 - (product.images?.length || 0)).fill(''),
      ].slice(0, 4),
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedData = {
      ...formData,
      images: (formData.images || []).filter((img) => img && img.trim() !== ''),
      price: Number(formData.price),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Видалити товар "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад
            </button>
            <h1 className="text-3xl font-bold text-gray-900">📦 Управління товарами</h1>
            <p className="text-gray-600 mt-2">Всього товарів: {products?.length || 0}</p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Створити товар
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product: Product) => (
            <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                {product.mainImage ? (
                  <img src={product.mainImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Без зображення
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
                <p className="text-2xl font-bold text-blue-600 mb-3">{product.price} ₴</p>
                
                {/* Характеристики */}
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  {product.manufacturer && <div>🏭 {product.manufacturer}</div>}
                  {product.country && <div>🌍 {product.country}</div>}
                  {product.type && <div>📂 {product.type}</div>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
                  >
                    Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 text-sm"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {editingProduct ? 'Редагувати товар' : 'Новий товар'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Основна інформація */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">📝 Основна інформація</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Назва товару *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SKU (Артикул) *</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ціна (₴) *</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Розмір *</label>
                      <select
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="Uni">Uni (Універсальний)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Опис</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                </div>

                {/* ✅ Характеристики */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">🏷️ Характеристики</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Виробник</label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="OrtoPro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Країна</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Німеччина"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Матеріал</label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Memory Foam"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Колір</label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Чорний"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Тип товару</label>
                      <input
                        type="text"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Ортопедичні устілки"
                      />
                    </div>
                  </div>
                </div>

                {/* Зображення */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">🖼️ Зображення</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Головне зображення (URL)</label>
                    <input
                      type="url"
                      value={formData.mainImage}
                      onChange={(e) => setFormData({ ...formData, mainImage: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg mb-4"
                      placeholder="https://i.imgur.com/example.jpg"
                    />
                  </div>
                  <label className="block text-sm font-medium mb-2">Додаткові зображення (до 4)</label>
                  {formData.images?.map((img, index) => (
                    <input
                      key={index}
                      type="url"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...(formData.images || [])];
                        newImages[index] = e.target.value;
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="w-full px-3 py-2 border rounded-lg mb-2"
                      placeholder={`Зображення ${index + 1} (необов'язково)`}
                    />
                  ))}
                </div>

                {/* ✅ Таблиця розмірів */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">📏 Таблиця розмірів</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL картинки таблиці розмірів</label>
                    <input
                      type="url"
                      value={formData.sizeChartUrl}
                      onChange={(e) => setFormData({ ...formData, sizeChartUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://i.imgur.com/size-chart.png"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Якщо додано - на карточці товару з'явиться кнопка "Таблиця розмірів"
                    </p>
                  </div>
                </div>

                {/* Відео */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">🎥 Відео</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL відео (YouTube або пряме посилання)</label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Збереження...'
                      : editingProduct
                      ? 'Оновити'
                      : 'Створити'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
