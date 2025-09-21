import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Folders from './pages/Folders';
import FolderFiles from './pages/FolderFiles';
import AdminPanel from './pages/AdminPanel';
import PublicFiles from './pages/PublicFiles';
import SharingManagement from './pages/SharingManagement';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealTimeProvider>
          <Router>
          <div className="App">
            <Toaster position="top-right" />
            <SessionTimeoutWarning />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/public" element={<PublicFiles />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/folders"
                element={
                  <ProtectedRoute>
                    <Folders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/folders/:folderId"
                element={
                  <ProtectedRoute>
                    <FolderFiles />
                  </ProtectedRoute>
                }
              />
        <Route
          path="/sharing"
          element={
            <ProtectedRoute>
              <SharingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
          </Router>
        </RealTimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;