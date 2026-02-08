import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/forms/LoginForm';
import AppChrome from '../components/layout/AppChrome';
import AuthContext from '../context/AuthContext';

const Login = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] dark:bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppChrome>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--background)] px-4 py-8 dark:bg-black">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary-color-start)] to-[var(--primary-color-end)] text-white shadow-lg">
              <span className="text-3xl font-bold">C</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your compliance dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </AppChrome>
  );
};

export default Login;
