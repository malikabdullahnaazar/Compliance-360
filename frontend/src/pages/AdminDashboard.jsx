import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Navbar from '../components/layout/Navbar';
import { getAgencies, getUsers } from '../services/admin.service';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/slices/uiSlice';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();
  const [agencies, setAgencies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agenciesRes, usersRes] = await Promise.all([
        getAgencies(),
        getUsers(),
      ]);
      setAgencies(Array.isArray(agenciesRes) ? agenciesRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      dispatch(addToast({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to load admin data.'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'superadmin') {
    return null;
  }

  const activeUsers = users.filter(u => u.is_active).length;
  const inactiveUsers = users.filter(u => !u.is_active).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-black dark:text-gray-100">
      <Sidebar onToggle={setSidebarCollapsed} />
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        id="admin-content"
      >
        <Navbar variant="app" />
        <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/dashboard"
                className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[var(--primary-color)] dark:text-gray-400 dark:hover:text-teal-400 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Super Admin Panel
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Manage agencies, users, and system settings
              </p>
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
              {/* Agencies Card */}
              <Card className="group hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-teal-100 dark:hover:border-teal-900/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
                      <Building2 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Agencies
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage organizations
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {agencies.length}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {agencies.length === 1 ? 'agency' : 'agencies'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Create and manage agency records, view agency details, and assign users
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {agencies.length > 0 ? (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent agencies:</p>
                        <div className="space-y-2">
                          {agencies.slice(0, 3).map((agency) => (
                            <div key={agency.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300 truncate">
                                {agency.name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {agency.created_at ? new Date(agency.created_at).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No agencies created yet
                      </div>
                    )}
                  </div>

                  <Link to="/admin/agencies">
                    <Button
                      variant="outline"
                      className="w-full justify-center group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 group-hover:text-teal-700 dark:group-hover:text-teal-400 group-hover:border-teal-300 dark:group-hover:border-teal-700"
                    >
                      Manage Agencies
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Users Card */}
              <Card className="group hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-100 dark:hover:border-blue-900/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Users
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage system users
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {users.length}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {users.length === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Create users, assign to agencies, and manage permissions
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {users.length > 0 ? (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {activeUsers}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                              {inactiveUsers}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Inactive</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No users created yet
                      </div>
                    )}
                  </div>

                  <Link to="/admin/users">
                    <Button
                      variant="outline"
                      className="w-full justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:border-blue-300 dark:group-hover:border-blue-700"
                    >
                      Manage Users
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

