import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

// Custom hook to check user roles
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook to check if user has specific role
export const useRole = (requiredRole) => {
  const { user } = useAuth();
  
  if (!user) {
    return false;
  }

  // Superadmin has access to everything
  if (user.role === 'superadmin') {
    return true;
  }

  // Check if user has the required role
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  
  return user.role === requiredRole;
};

// Hook to check if user is superadmin
export const useIsSuperAdmin = () => {
  const { user } = useAuth();
  return user?.role === 'superadmin';
};

// Hook to check if user is agency admin
export const useIsAgencyAdmin = () => {
  const { user } = useAuth();
  return user?.role === 'agency_admin';
};

// Hook to check if user is superadmin or agency admin
export const useIsSuperOrAgencyAdmin = () => {
  const { user } = useAuth();
  return user?.role === 'superadmin' || user?.role === 'agency_admin';
};