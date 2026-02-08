import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail } from 'lucide-react';
import { setLoading, addToast } from '../../store/slices/uiSlice';
import AuthContext from '../../context/AuthContext';
import TextInput from '../inputs/TextInput';
import PasswordInput from '../inputs/PasswordInput';
import Button from '../ui/Button';

const LoginForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login: authLogin } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    dispatch(setLoading({ isLoading: true, message: 'Authenticating...' }));
    try {
      const data = await authLogin(email, password);
      if (data && data.access) {
        dispatch(setLoading({ isLoading: false, message: '' }));
        dispatch(addToast({ type: 'success', message: 'Welcome back.' }));
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.email?.[0] || err.message || 'Invalid credentials. Please try again.';
      setError(errorMessage);
      dispatch(setLoading({ isLoading: false, message: '' }));
      dispatch(addToast({ type: 'error', message: errorMessage }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextInput
        id="email"
        label="Email address"
        type="email"
        icon={Mail}
        placeholder="name@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <PasswordInput
        id="password"
        label="Password"
        value={password}
        placeholder="••••••••"
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-medium">{error}</p>
        </div>
      )}
      <Button
        as="button"
        type="submit"
        className="w-full"
        variant="primary"
        size="md"
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;

