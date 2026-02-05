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
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput
        id="email"
        label="Email"
        type="email"
        icon={Mail}
        placeholder="Enter your email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
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

