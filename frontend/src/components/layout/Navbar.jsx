import { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  MoonStar,
  SunMedium,
  Bell,
  User,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  Home,
  Menu,
  X,
} from 'lucide-react';
import LogoutModal from '../common/LogoutModal';
import { useState } from 'react';
import { selectTheme, toggleTheme } from '../../store/slices/themeSlice';
import { addToast } from '../../store/slices/uiSlice';
import AuthContext from '../../context/AuthContext';
import Button from '../ui/Button';
import AppLogo from '../ui/AppLogo';

const Navbar = ({ variant = 'app', onMenuToggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector(selectTheme);
  const { user, logout } = useContext(AuthContext);
  const isLanding = variant === 'landing';

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const alignConfirmLogout = async () => {
    try {
      await logout();
      dispatch(addToast({ type: 'success', message: 'Logged out successfully.' }));
      navigate('/login');
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to logout.' }));
    }
    setIsLogoutModalOpen(false);
  };

  const containerClass = isLanding
    ? 'sticky top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16 flex items-center'
    : 'sticky top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90 backdrop-blur-md h-16 flex items-center';

  return (
    <header className={containerClass}>
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 ">
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <AppLogo />
        </div>
        <nav className="flex items-center gap-1 md:gap-4" aria-label="Primary navigation">
          {/* Middle navigation links removed as requested */}
        </nav>
        <div className="flex items-center gap-1">
          {user && (
            <>
              <Link
                to="/"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 cursor-pointer"
                aria-label="Home"
              >
                <Home className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleTheme}
            aria-label="Toggle theme"
          >
            {mode === 'dark' ? (
              <SunMedium className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MoonStar className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          {user && (
            <Button
              as={Link}
              to="/dashboard"
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
          )}
          {!user && (
            <Button
              as={Link}
              to="/login"
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {isLanding ? 'Get Started' : 'Login'}
            </Button>
          )}
        </div>
      </div>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={alignConfirmLogout}
      />
    </header>
  );
};

export default Navbar;
