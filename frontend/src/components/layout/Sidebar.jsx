import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Stethoscope,
  FileText,
  TrendingUp,
  X,
  Brain,
} from 'lucide-react';
import { addToast } from '../../store/slices/uiSlice';
import AuthContext from '../../context/AuthContext';
import { useContext } from 'react';

import LogoutModal from '../common/LogoutModal';

const Sidebar = ({ onToggle, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, logout } = useContext(AuthContext);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggle) {
      onToggle(newState);
    }
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

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Overview',
      path: '/dashboard',
    },
    {
      icon: Building2,
      label: 'Agencies',
      path: '/admin/agencies',
      roles: ['superadmin'],
    },
    {
      icon: Users,
      label: 'Users',
      path: '/admin/users',
      roles: ['superadmin'],
    },
    {
      icon: ShieldCheck,
      label: 'Agency Dashboard',
      path: '/agency-dashboard',
      roles: ['agency_admin'],
    },
    {
      icon: Stethoscope,
      label: 'Patients',
      path: '/patients',
      roles: ['agency_admin'],
    },
    {
      icon: FileText,
      label: 'Documents',
      path: '/documents',
      roles: ['agency_admin'],
    },
    {
      icon: Brain,
      label: 'AI Analyzer',
      path: '/ai-analyzer',
      roles: ['agency_admin'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    // Superadmin can see everything
    // Superadmin can see everything
    if (user?.role === 'superadmin') {
      // But superadmin shouldn't see patient/document/agency-dashboard routes
      if (['patients', 'documents', 'agency-dashboard'].includes(item.path.replace(/^\//, ''))) {
        return false;
      }
      return true;
    }
    // Agency admin can see Overview, Patients, and Documents
    if (user?.role === 'agency_admin') {
      // Exclude admin routes, agency-dashboard and analytics
      if (['admin/agencies', 'admin/users', 'analytics', 'agency-dashboard'].includes(item.path.replace(/^\//, ''))) {
        return false;
      }
      return ['/dashboard', '/patients', '/documents', '/ai-analyzer'].includes(item.path);
    }
    return user && item.roles.includes(user.role);
  });

  const isActive = (path, hash) => {
    if (hash) {
      return location.pathname === path && location.hash === hash;
    }
    return location.pathname === path && !location.hash;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl transition-all duration-300 
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.role === 'superadmin' ? 'Super Admin' : 'Compliance 360'}
              </h2>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggle}
                className="hidden lg:block rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 cursor-pointer"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Sidebar navigation">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.hash);
              const href = item.hash ? `${item.path}${item.hash}` : item.path;

              return (
                <Link
                  key={item.label}
                  to={href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${active
                    ? 'bg-gray-100 text-gray-900 dark:bg-teal-500/10 dark:text-teal-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active
                      ? 'text-gray-900 dark:text-teal-400'
                      : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                      }`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-3">
            <button
              type="button"
              onClick={handleLogoutClick}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer ${isCollapsed ? 'justify-center' : ''
                }`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut
                className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300"
                aria-hidden="true"
              />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
        <LogoutModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={alignConfirmLogout}
        />
      </aside>
    </>
  );
};

export default Sidebar;
