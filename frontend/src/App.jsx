import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AgenciesPage from './pages/AgenciesPage';
import UsersPage from './pages/UsersPage';
import AgencyDashboard from './pages/AgencyDashboard';
import PatientsPage from './pages/PatientsPage';
import NewPatientForm from './pages/NewPatientForm';
import PatientDetailsPage from './pages/PatientDetailsPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import GlobalUI from './components/feedback/GlobalUI';
import RoleBasedRoute from './components/common/RoleBasedRoute';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] dark:bg-gray-900">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
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
        path="/admin/agencies"
        element={
          <RoleBasedRoute allowedRoles={['superadmin']} redirectTo="/dashboard">
            <AgenciesPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RoleBasedRoute allowedRoles={['superadmin']} redirectTo="/dashboard">
            <UsersPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/agency-dashboard"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <AgencyDashboard />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <PatientsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/patients/new"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <NewPatientForm />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <PatientDetailsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <DocumentsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/documents/upload"
        element={
          <RoleBasedRoute allowedRoles={['agency_admin']} redirectTo="/dashboard">
            <DocumentUploadPage />
          </RoleBasedRoute>
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
