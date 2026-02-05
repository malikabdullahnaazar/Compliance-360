import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { User2 } from 'lucide-react';
import { setLoading, addToast } from '../../store/slices/uiSlice';
import AuthContext from '../../context/AuthContext';
import TextInput from '../inputs/TextInput';
import PasswordInput from '../inputs/PasswordInput';
import Button from '../ui/Button';

const LoginForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login: authLogin } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    dispatch(setLoading({ isLoading: true, message: 'Authenticating...' }));
    try {
      const data = await authLogin(username, password);
      dispatch(setLoading({ isLoading: false, message: '' }));
      dispatch(addToast({ type: 'success', message: 'Welcome back.' }));
      navigate('/dashboard');
    } catch (err) {
      const message = 'Invalid credentials. Please try again.';
      setError(message);
      dispatch(setLoading({ isLoading: false, message: '' }));
      dispatch(addToast({ type: 'error', message }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput
        id="username"
        label="Username"
        icon={User2}
        placeholder="Enter your username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
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

