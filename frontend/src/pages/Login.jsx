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
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent dark:from-teal-400 dark:to-teal-500">
              Compliance 360
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
              Sign in to your account
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </AppChrome>
  );
};

export default Login;
