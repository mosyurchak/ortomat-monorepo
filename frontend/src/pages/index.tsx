import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '../lib/api';

export default function Home() {
  const { data: ortomats, isLoading } = useQuery({
    queryKey: ['ortomats'],
    queryFn: api.getOrtomats.bind(api),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Zavantazhennya...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ortomat
          </h1>
          <p className="text-xl text-gray-600">
            Sistema avtomatyzovanogo prodazhu ortopedychnyh vyrobiv
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            Oberit nayblyzhchyy ortomat:
          </h2>
          
          {!ortomats || ortomats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Narazi nemaye dostupnyh ortomativ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ortomats.map((ortomat: any) => (
                <Link
                  key={ortomat.id}
                  href={`/catalog/${ortomat.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 cursor-pointer border-2 border-transparent hover:border-blue-500">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {ortomat.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        ortomat.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ortomat.status === 'active' ? 'Aktyvnyy' : 'Neaktyvnyy'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-gray-600">
                      <p className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {ortomat.address}
                      </p>
                      
                      <p className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {ortomat.totalCells} komirok
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-blue-600 font-medium hover:text-blue-700">
                        Pereglyanut katalog
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Vhid dlya personalu
          </Link>
        </div>
      </div>
    </div>
  );
}