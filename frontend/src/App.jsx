import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import GlobalUI from './components/feedback/GlobalUI';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] dark:bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] dark:bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/dashboard" replace />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminDashboard />
          </SuperAdminRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <GlobalUI />
      </Router>
    </AuthProvider>
  );
}

export default App;
