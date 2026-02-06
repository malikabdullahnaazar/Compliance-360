import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Plus, ArrowLeft } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Navbar from '../components/layout/Navbar';
import { getAgencies, createAgency, getUsers } from '../services/admin.service';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [agencies, setAgencies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [agenciesRes, usersRes] = await Promise.all([
        getAgencies(),
        getUsers(),
      ]);
      setAgencies(Array.isArray(agenciesRes) ? agenciesRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAgency = async (e) => {
    e.preventDefault();
    const name = newAgencyName.trim();
    if (!name) return;
    setCreating(true);
    setError('');
    try {
      await createAgency(name);
      setNewAgencyName('');
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'Failed to create agency.',
      );
    } finally {
      setCreating(false);
    }
  };

  if (!user || user.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-black dark:text-gray-100">
      <Sidebar onToggle={setSidebarCollapsed} />
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        id="admin-content"
      >
        <Navbar variant="app" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
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
                Super Admin
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Create agencies and manage users.
              </p>
            </div>
          </header>

          {error && (
            <div
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Building2 className="h-5 w-5 text-teal-500" aria-hidden="true" />
                    Create Agency
                  </h2>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateAgency} className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={newAgencyName}
                      onChange={(e) => setNewAgencyName(e.target.value)}
                      placeholder="Agency name"
                      className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      aria-label="Agency name"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={creating || !newAgencyName.trim()}
                      className="cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {creating ? 'Creating...' : 'Create'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Building2 className="h-5 w-5 text-teal-500" aria-hidden="true" />
                    Agencies
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    {agencies.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No agencies yet. Create one above.
                      </p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 pr-4 text-left font-medium text-gray-600 dark:text-gray-400">
                              Name
                            </th>
                            <th className="pb-2 pr-4 text-left font-medium text-gray-600 dark:text-gray-400">
                              Slug
                            </th>
                            <th className="pb-2 text-left font-medium text-gray-600 dark:text-gray-400">
                              Created
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-300">
                          {agencies.map((a) => (
                            <tr
                              key={a.id}
                              className="border-b border-gray-100 dark:border-gray-700"
                            >
                              <td className="py-3 pr-4 font-medium">{a.name}</td>
                              <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{a.slug}</td>
                              <td className="py-3">
                                {a.created_at
                                  ? new Date(a.created_at).toLocaleDateString()
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Users className="h-5 w-5 text-teal-500" aria-hidden="true" />
                    Users
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    {users.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No users in the system.
                      </p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 pr-4 text-left font-medium text-gray-600 dark:text-gray-400">
                              Username
                            </th>
                            <th className="pb-2 pr-4 text-left font-medium text-gray-600 dark:text-gray-400">
                              Email
                            </th>
                            <th className="pb-2 pr-4 text-left font-medium text-gray-600 dark:text-gray-400">
                              Role
                            </th>
                            <th className="pb-2 text-left font-medium text-gray-600 dark:text-gray-400">
                              Agency
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-300">
                          {users.map((u) => (
                            <tr
                              key={u.id}
                              className="border-b border-gray-100 dark:border-gray-700"
                            >
                              <td className="py-3 pr-4 font-medium">{u.username}</td>
                              <td className="py-3 pr-4">{u.email || '—'}</td>
                              <td className="py-3 pr-4">{u.role || '—'}</td>
                              <td className="py-3">{u.agency_name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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
