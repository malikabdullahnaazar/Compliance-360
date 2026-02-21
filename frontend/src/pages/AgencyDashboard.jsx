import { useContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Clock3,
  Shield,
  LogOut,
  Building2,
  Users,
  ArrowRight,
  UserPlus,
  FileUp,
  Stethoscope,
  Activity,
  TrendingUp,
  Brain
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import AuthContext from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';

const AgencyDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock data for agency dashboard
  const agencyStats = {
    patients: 24,
    documents: 156,
    audits: 18,
    complianceScore: 87,
    criticalFindings: 3,
    highRiskIssues: 8
  };

  const recentPatients = [
    { id: 1, name: 'John Smith', dob: '1956-03-15', status: 'Active', lastAudit: '2024-01-15' },
    { id: 2, name: 'Mary Johnson', dob: '1948-11-22', status: 'Active', lastAudit: '2024-01-10' },
    { id: 3, name: 'Robert Davis', dob: '1962-07-08', status: 'Pending', lastAudit: '2024-01-05' },
  ];

  const recentDocuments = [
    { id: 1, patient: 'John Smith', type: 'Plan of Care', date: '2024-01-15', status: 'Processed' },
    { id: 2, patient: 'Mary Johnson', type: 'RN Assessment', date: '2024-01-14', status: 'Pending' },
    { id: 3, patient: 'Robert Davis', type: 'Physician Orders', date: '2024-01-13', status: 'Processed' },
  ];

  const complianceTrends = [
    { month: 'Jan', score: 82 },
    { month: 'Feb', score: 85 },
    { month: 'Mar', score: 87 },
    { month: 'Apr', score: 84 },
    { month: 'May', score: 86 },
    { month: 'Jun', score: 87 },
  ];

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
          <header className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Agency Dashboard
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Manage patients, documents, and compliance audits for your agency.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          </header>

          {/* Agency Stats Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-8">
            <Card className="p-5 sm:p-6 col-span-2">
              <CardContent className="p-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Patients</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {agencyStats.patients}
                </p>
                <p className="mt-2 text-sm text-teal-600 dark:text-teal-400">+2 this month</p>
              </CardContent>
            </Card>

            <Card className="p-5 sm:p-6 col-span-2">
              <CardContent className="p-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Documents Processed</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {agencyStats.documents}
                </p>
                <p className="mt-2 text-sm text-teal-600 dark:text-teal-400">+15 this week</p>
              </CardContent>
            </Card>

            <Card className="p-5 sm:p-6 col-span-2">
              <CardContent className="p-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compliance Score</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {agencyStats.complianceScore}%
                </p>
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {agencyStats.criticalFindings} critical findings
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Link to="/patients" className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <Stethoscope className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Patients
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage patient records and information
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/documents" className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Documents
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload and manage patient documents
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/audits" className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Audits
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Review audit results and findings
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/analytics" className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-green-200 dark:hover:border-green-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Analytics
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    View compliance trends and insights
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ai-analyzer" className="block group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    AI Analyzer
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Analyze patient documents using AI
                  </p>
                </CardContent>
              </Card>
            </Link>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Stethoscope className="h-4 w-4 text-teal-500" aria-hidden="true" />
                    Recent Patients
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Audit</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentPatients.map((patient) => (
                          <tr key={patient.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{patient.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{patient.dob}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${patient.status === 'Active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                {patient.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {patient.lastAudit}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <Link to={`/patients/${patient.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-4 w-4 text-teal-500" aria-hidden="true" />
                    Recent Documents
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentDocuments.map((doc) => (
                          <tr key={doc.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.type}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {doc.patient}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {doc.date}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${doc.status === 'Processed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                {doc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-teal-500" aria-hidden="true" />
                    Compliance Trends
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    {complianceTrends.map((month, index) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="font-medium">{month.month}</span>
                        <span>{month.score}%</span>
                      </div>
                    ))}
                    <div className="mt-4 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary-color-start)] to-[var(--primary-color-end)] animate-pulse"
                        style={{ width: `${agencyStats.complianceScore}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Clock3 className="h-4 w-4 text-teal-500" aria-hidden="true" />
                    Recent Activity
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    {[
                      { text: 'New patient added: John Smith', meta: '2 minutes ago', dot: 'bg-teal-500' },
                      { text: 'Document uploaded: Plan of Care', meta: '15 minutes ago', dot: 'bg-[var(--primary-color)]' },
                      { text: 'Audit completed: Mary Johnson', meta: '1 hour ago', dot: 'bg-amber-500' },
                      { text: 'Critical finding identified', meta: '3 hours ago', dot: 'bg-red-500' },
                    ].map((activity, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.dot}`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{activity.text}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{activity.meta}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboard;