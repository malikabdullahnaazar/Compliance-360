import { useContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Clock3,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
  UserCheck,
  Stethoscope,
  UserPlus,
  FileUp,
  ClipboardList,
  CheckCircle,
  Clock
} from 'lucide-react';
import { agencyService } from '../services/agency.service';
import { patientService } from '../services/patient.service';
import { documentService } from '../services/document.service';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import AuthContext from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { addToast } from '../store/slices/uiSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({ agencies: 0, users: 0, activeUsers: 0 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [clinicianAssignments, setClinicianAssignments] = useState([]);
  const [clinicianStats, setClinicianStats] = useState({ total: 0, incomplete: 0, complete: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (user?.role === 'superadmin') {
          const analyticsRes = await agencyService.getAnalytics();
          const data = analyticsRes.data;

          setAnalyticsData(data);
          setAdminStats({
            agencies: data.total_agencies,
            users: data.total_users,
            activeUsers: data.active_users
          });
        }
        else if (user?.role === 'agency_admin' || user?.role === 'qa_compliance') {
          const [analyticsRes, patientsRes, documentsRes] = await Promise.allSettled([
            agencyService.getAnalytics(),
            patientService.getPatients(),
            documentService.getDocuments()
          ]);

          if (analyticsRes.status === 'fulfilled') {
            setAnalyticsData(analyticsRes.value.data);
          }

          if (patientsRes.status === 'fulfilled') {
            const patientsList = Array.isArray(patientsRes.value.data?.results)
              ? patientsRes.value.data.results
              : Array.isArray(patientsRes.value.data) ? patientsRes.value.data : [];
            setRecentPatients(patientsList.slice(0, 5));
          }

          if (documentsRes.status === 'fulfilled') {
            const documentsList = Array.isArray(documentsRes.value.data?.results)
              ? documentsRes.value.data.results
              : Array.isArray(documentsRes.value.data) ? documentsRes.value.data : [];
            setRecentDocuments(documentsList.slice(0, 5));
          }
        }
        else if (user?.role === 'clinician') {
          // Fetch only the assignments assigned to this clinician
          try {
            const { default: api } = await import('../services/api');
            const res = await api.get('/ai/mistral/assigned/');
            const assignments = res.data || [];
            setClinicianAssignments(assignments.slice(0, 5));
            setClinicianStats({
              total: assignments.length,
              incomplete: assignments.filter(a => a.status !== 'complete').length,
              complete: assignments.filter(a => a.status === 'complete').length,
            });
          } catch (err) {
            console.error('Failed to fetch clinician assignments', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
        dispatch(addToast({ type: 'error', message: 'Failed to load some dashboard data' }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dispatch]);

  const handleAction = (msg) => {
    dispatch(addToast({ type: 'success', message: msg }));
  };

  const renderClinicianDashboard = () => (
    <div className="space-y-8">
      {(user?.username || user?.email) && (
        <section
          className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 text-sm text-gray-600
            dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
          aria-label="Your account"
        >
          <span className="font-medium text-gray-800 dark:text-gray-100">Signed in as </span>
          {user?.username && (
            <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span>
          )}
          {user?.email && (
            <span className="block sm:inline sm:before:content-['_·_'] sm:before:font-normal text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </span>
          )}
        </section>
      )}
      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
              <ClipboardList className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assigned</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{clinicianStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
              <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{clinicianStats.incomplete}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
              <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">{clinicianStats.complete}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Quick Action */}
      <section>
        <Link to="/assigned-audit-reports" className="block group">
          <Card className="transition-all duration-200 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <ClipboardList className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Assigned Audit Reports</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Review AI-generated compliance reports and submit your documentation
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transform group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Recent Assignments Table */}
      <Card>
        <CardHeader className="py-4 border-b dark:border-gray-800">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal-500" />
            My Recent Assigned Reports
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3 text-center">AI Result</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Assigned On</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {clinicianAssignments.length > 0 ? clinicianAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{a.patient_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.ai_status === 'Pass'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {a.ai_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.status === 'complete'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        {a.status === 'complete' ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {new Date(a.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/assigned-audit-reports"
                        className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 font-medium hover:underline text-xs"
                      >
                        View All
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No reports assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSuperAdminDashboard = () => (
    <div className="space-y-8">
      {/* Management Cards */}
      <section className="grid gap-6 md:grid-cols-2">
        <Link to="/admin/agencies" className="block group">
          <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <Building2 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transform group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Manage Agencies
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create and manage agency profiles and assignments
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {adminStats.agencies}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total agencies</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/users" className="block group">
          <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Manage Users
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                System users, role assignments, and access control
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {adminStats.users}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  users ({adminStats.activeUsers} active)
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Integrated Analytics Summary */}
      {analyticsData && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Analytics</h2>
            <div className="flex gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Patients</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analyticsData.total_patients}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Documents</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analyticsData.total_documents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Compliance</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analyticsData.average_compliance_score}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <Activity className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Audits</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{analyticsData.total_audits}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-4 border-b dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Agency Breakdown</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Agency</th>
                      <th className="px-6 py-3 text-center">Patients</th>
                      <th className="px-6 py-3 text-center">Docs</th>
                      <th className="px-6 py-3 text-center">Audits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {analyticsData.agency_breakdown?.map((agency) => (
                      <tr key={agency.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{agency.name}</td>
                        <td className="px-6 py-4 text-center">{agency.patient_count}</td>
                        <td className="px-6 py-4 text-center">{agency.document_count}</td>
                        <td className="px-6 py-4 text-center">{agency.audit_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );

  const renderAgencyAdminDashboard = () => (
    <div className="space-y-8">
      {user?.role === 'qa_compliance' && (user?.username || user?.email) && (
        <section
          className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 text-sm text-gray-600
            dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
          aria-label="Your account"
        >
          <span className="font-medium text-gray-800 dark:text-gray-100">Signed in as </span>
          {user?.username && (
            <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span>
          )}
          {user?.email && (
            <span className="block sm:inline sm:before:content-['_·_'] sm:before:font-normal text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </span>
          )}
        </section>
      )}
      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Patients</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{analyticsData?.total_patients || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Documents</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{analyticsData?.total_documents || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Audit Sessions</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{analyticsData?.total_audits || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compliance score</p>
          <p className="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400">{analyticsData?.average_compliance_score || 0}%</p>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="grid gap-6 md:grid-cols-2">
        <Link to="/patients" className="block group">
          <Card className="transition-all hover:shadow-md dark:hover:border-teal-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Patients Management</h3>
                  <p className="text-sm text-gray-500">View and add new patients</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/documents" className="block group">
          <Card className="transition-all hover:shadow-md dark:hover:border-blue-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Document Compliance</h3>
                  <p className="text-sm text-gray-500">Upload and audit documentation</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Recent Data Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="py-4 border-b dark:border-gray-800">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-500" />
              Recent Patients
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y dark:divide-gray-800">
                  {recentPatients.length > 0 ? recentPatients.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 font-medium">{p.first_name} {p.last_name}</td>
                      <td className="px-6 py-4 text-gray-500">{p.email}</td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/patients/${p.id}`} className="text-teal-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="px-6 py-8 text-center text-gray-500">No patients found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b dark:border-gray-800">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Recent Documents
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y dark:divide-gray-800">
                  {recentDocuments.length > 0 ? recentDocuments.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 font-medium truncate max-w-[150px]">{d.filename}</td>
                      <td className="px-6 py-4 text-gray-500">{d.document_type_display || d.document_type}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 rounded-full">Processed</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="px-6 py-8 text-center text-gray-500">No documents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
      <Sidebar
        onToggle={setSidebarCollapsed}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
        <Navbar
          variant="app"
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <header className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {user?.role === 'superadmin' ? 'System Overview' : user?.role === 'qa_compliance' ? 'QA/Compliance Overview' : user?.role === 'clinician' ? 'Clinician Overview' : 'Agency Overview'}
              </h1>
              {user?.username && (
                <p className="mt-1 text-base font-medium text-teal-700 dark:text-teal-300">
                  Welcome, {user.username}.
                </p>
              )}
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                {user?.role === 'superadmin'
                  ? 'Monitor system performance, manage agencies, and oversee compliance across all organizations.'
                  : user?.role === 'qa_compliance'
                    ? 'Monitor patients, documents, and compliance status for quality assurance.'
                    : user?.role === 'clinician'
                      ? 'View and complete your assigned audit reports with full access to AI compliance analysis.'
                      : `Monitor your agency's health, patients, and compliance status.`}
              </p>
            </div>
            <div className="flex gap-3">
              {user?.role === 'agency_admin' || user?.role === 'qa_compliance' ? (
                <>
                  <Link to="/patients/new">
                    <Button type="button" variant="primary" size="sm" className="cursor-pointer">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Patient
                    </Button>
                  </Link>
                  <Link to="/documents/upload">
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </Link>
                </>
              ) : user?.role === 'clinician' ? (
                <Link to="/assigned-audit-reports">
                  <Button type="button" variant="primary" size="sm" className="cursor-pointer">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    My Audit Reports
                  </Button>
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => handleAction('System check initiated')}
                >
                  Run System Check
                </Button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-gray-500">Loading overview...</p>
            </div>
          ) : user?.role === 'superadmin' ? (
            renderSuperAdminDashboard()
          ) : (user?.role === 'agency_admin' || user?.role === 'qa_compliance') ? (
            renderAgencyAdminDashboard()
          ) : user?.role === 'clinician' ? (
            renderClinicianDashboard()
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-gray-500">Access Restricted</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
