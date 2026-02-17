import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Database } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">NeuroTrace Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Admin Panel</span>
              <button
                onClick={logout}
                className="rounded-md bg-gray-100 p-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
           <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 p-3 rounded-md">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">System Status</dt>
                    <dd className="text-lg font-medium text-green-600">Healthy</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Admin Tools</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link to="/admin/users" className="rounded-lg bg-white p-6 shadow hover:bg-gray-50 block">
              <h4 className="font-bold text-gray-900">User Management</h4>
              <p className="mt-2 text-sm text-gray-500">Manage clinicians and patients</p>
            </Link>
             <Link to="/admin/logs" className="rounded-lg bg-white p-6 shadow hover:bg-gray-50 block">
              <h4 className="font-bold text-gray-900">Audit Logs</h4>
              <p className="mt-2 text-sm text-gray-500">View system access logs</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
