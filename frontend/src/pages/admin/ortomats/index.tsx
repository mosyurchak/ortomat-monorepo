import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../../lib/api';
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrtomatsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingOrtomat, setEditingOrtomat] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    totalCells: 37,
  });

  const { data: ortomats, isLoading } = useQuery('ortomats', () => api.getOrtomats());

  const createMutation = useMutation(
    (data: any) => api.createOrtomat(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ortomats');
        toast.success('Ortomat created!');
        resetForm();
      },
      onError: () => {
        toast.error('Failed to create ortomat');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: any) => api.updateOrtomat(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ortomats');
        toast.success('Ortomat updated!');
        resetForm();
      },
      onError: () => {
        toast.error('Failed to update ortomat');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.deleteOrtomat(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ortomats');
        toast.success('Ortomat deleted!');
      },
      onError: () => {
        toast.error('Failed to delete ortomat');
      },
    }
  );

  const resetForm = () => {
    setShowModal(false);
    setEditingOrtomat(null);
    setFormData({ name: '', address: '', totalCells: 37 });
  };

  const handleEdit = (ortomat: any) => {
    setEditingOrtomat(ortomat);
    setFormData({
      name: ortomat.name,
      address: ortomat.address,
      totalCells: ortomat.totalCells || 37,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrtomat) {
      updateMutation.mutate({ id: editingOrtomat.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Manage Ortomats - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">Manage Ortomats</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Ortomat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ortomats?.data?.map((ortomat: any) => (
              <div key={ortomat.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{ortomat.name}</h3>
                  
                  <div className="flex items-start mb-4">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{ortomat.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600">Total Cells</p>
                      <p className="text-2xl font-bold text-gray-900">{ortomat.totalCells || 37}</p>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-gray-600">Status</p>
                      <p className="text-sm font-semibold text-green-600 capitalize">
                        {ortomat.status || 'active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(ortomat)}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ortomat.id, ortomat.name)}
                      className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingOrtomat ? 'Edit Ortomat' : 'Create Ortomat'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cells</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalCells}
                    onChange={(e) => setFormData({ ...formData, totalCells: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {createMutation.isLoading || updateMutation.isLoading
                    ? 'Saving...'
                    : editingOrtomat
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}