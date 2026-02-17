import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const [role, setRole] = useState<'clinician' | 'admin'>('clinician');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
    if (role === 'clinician') {
      navigate('/dashboard');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <Stethoscope size={24} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to NeuroTrace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Select your role to continue
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setRole('clinician')}
              className={`flex flex-col items-center justify-center rounded-lg border p-4 transition-all w-40 ${
                role === 'clinician'
                  ? 'border-primary bg-blue-50 text-primary ring-2 ring-primary ring-offset-2'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Stethoscope className="mb-2 h-6 w-6" />
              <span className="font-medium">Clinician</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex flex-col items-center justify-center rounded-lg border p-4 transition-all w-40 ${
                role === 'admin'
                  ? 'border-primary bg-blue-50 text-primary ring-2 ring-primary ring-offset-2'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="mb-2 h-6 w-6" />
              <span className="font-medium">Admin</span>
            </button>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
