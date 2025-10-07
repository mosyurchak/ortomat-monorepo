import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { usersApi } from '../../../lib/api';
import { ArrowLeft, Users, Mail, Phone, Award, Truck } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'DOCTOR' | 'COURIER'>('ALL');

  const { data: users, isLoading } = useQuery(
    'users',
    () => usersApi.getAll(),
    {
      retry: false,
    }
  );

  const filteredUsers = users?.data?.filter((user: any) => {
    if (filter === 'ALL') return user.role !== 'ADMIN';
    return user.role === filter;
  });

  const doctorsCount = users?.data?.filter((u: any) => u.role === 'DOCTOR').length || 0;
  const couriersCount = users?.data?.filter((u: any) => u.role === 'COURIER').length || 0;

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
        <title>Manage Users - Admin</title>
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
                Back
              </button>
              <h1 className="text-xl font-bold">Manage Users</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Doctors</p>
                  <p className="text-3xl font-bold text-blue-600">{doctorsCount}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Award className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Couriers</p>
                  <p className="text-3xl font-bold text-green-600">{couriersCount}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Truck className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setFilter('DOCTOR')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'DOCTOR'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Doctors ({doctorsCount})
            </button>
            <button
              onClick={() => setFilter('COURIER')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'COURIER'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Couriers ({couriersCount})
            </button>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-primary-100 p-2 rounded-full mr-3">
                          <Users className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.middleName && (
                            <p className="text-sm text-gray-500">{user.middleName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'DOCTOR'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'COURIER'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {user.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers?.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}