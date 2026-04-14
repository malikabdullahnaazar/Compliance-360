import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] dark:bg-gray-900">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return children;
  }

  // Check if user has one of the allowed roles
  if (allowedRoles.includes(user.role)) {
    return children;
  }

  // Redirect if user doesn't have required role
  return <Navigate to={redirectTo} replace />;
};

export default RoleBasedRoute;