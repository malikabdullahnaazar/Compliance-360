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
} from 'lucide-react';
import { selectTheme, toggleTheme } from '../../store/slices/themeSlice';
import { addToast } from '../../store/slices/uiSlice';
import AuthContext from '../../context/AuthContext';
import Button from '../ui/Button';
import AppLogo from '../ui/AppLogo';

const navLinkBase =
  'relative px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:text-[var(--primary-color)] dark:hover:text-white cursor-pointer';

const IconWithDot = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 cursor-pointer"
    aria-label={label}
  >
    <Icon className="h-5 w-5" aria-hidden="true" />
    <span
      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--primary-color)] ring-2 ring-white dark:ring-gray-900"
      aria-hidden="true"
    />
  </button>
);

const Navbar = ({ variant = 'app' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector(selectTheme);
  const { user, logout } = useContext(AuthContext);
  const isLanding = variant === 'landing';

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleLogout = async () => {
    try {
      await logout();
      dispatch(addToast({ type: 'success', message: 'Logged out successfully.' }));
      navigate('/login');
    } catch (error) {
      dispatch(addToast({ type: 'error', message: 'Failed to logout.' }));
    }
  };

  const containerClass = isLanding
    ? 'sticky top-0 left-0 right-0 z-50 bg-[#f9fafb]/90 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200/70 dark:border-slate-800'
    : 'border-b border-gray-200 bg-white/80 dark:border-dark-border dark:bg-dark-card/80 backdrop-blur-sm';

  const ctaButtonClass = isLanding
    ? 'bg-gradient-to-r from-[var(--primary-color-start)] to-[var(--primary-color-end)] hover:from-[var(--primary-hover-start)] hover:to-[var(--primary-hover-end)] text-white px-4 py-2 rounded-full text-sm font-medium transition-colors'
    : '';

  return (
    <header className={containerClass}>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 max-w-7xl">
        <AppLogo />
        <nav className="flex items-center gap-1 md:gap-4" aria-label="Primary navigation">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'text-[var(--primary-color)] dark:text-teal-400' : ''}`
            }
          >
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive ? 'text-[var(--primary-color)] dark:text-teal-400' : ''}`
                }
              >
                Dashboard
              </NavLink>
              {user.role === 'superadmin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `${navLinkBase} inline-flex items-center gap-1.5 ${isActive ? 'text-[var(--primary-color)] dark:text-teal-400' : ''}`
                  }
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin
                </NavLink>
              )}
            </>
          ) : (
            <Link to="/login" className={`${navLinkBase} inline-flex items-center gap-1.5`}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign In
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1">
          {user && (
            <>
              <IconWithDot icon={Bell} label="Notifications" onClick={() => {}} />
              <IconWithDot
                icon={User}
                label="Profile"
                onClick={() => user && navigate('/dashboard')}
              />
              <button
                type="button"
                onClick={handleLogout}
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
          {!user &&
            (isLanding ? (
              <Link
                to="/login"
                className={`hidden sm:inline-flex items-center justify-center cursor-pointer ${ctaButtonClass}`}
              >
                Get Started
              </Link>
            ) : (
              <Button
                as={Link}
                to="/login"
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
