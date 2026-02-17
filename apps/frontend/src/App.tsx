import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import PatientDetail from './pages/clinician/PatientDetail';
import Alerts from './pages/clinician/Alerts';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';

// Protected Route Wrapper
const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: 'clinician' | 'admin' }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    // Redirect based on role if unauthorized
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Clinician Routes */}

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute role="clinician">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/patients/:id" 
            element={
              <ProtectedRoute role="clinician">
                <PatientDetail />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/alerts" 
            element={
              <ProtectedRoute role="clinician">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                  <Alerts />
                </div>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute role="admin">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                  <UserManagement />
                </div>
              </ProtectedRoute>
            } 
          />
           <Route 
            path="/admin/logs" 
            element={
              <ProtectedRoute role="admin">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                  <AuditLogs />
                </div>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
