import { useContext } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Clock3, Shield } from 'lucide-react';
import AppChrome from '../components/layout/AppChrome';
import AuthContext from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useContext(AuthContext);

  const handleAdminAction = () => {
    dispatch({
      type: 'admin/performSensitiveExport',
      meta: { roles: ['admin'] },
    });
  };

  const stats = [
    { label: 'Overall posture', value: '92%', sub: 'On track · +4% vs last week', accent: 'text-teal-600 dark:text-teal-400' },
    { label: 'Controls complete', value: '128 / 140', sub: '12 remaining in progress', accent: 'text-gray-500' },
    { label: 'Open risks', value: '6 high', sub: '14 medium · 9 low', accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Next audit window', value: '23 days', sub: 'SOC 2 Type II', accent: 'text-gray-500' },
  ];

  return (
    <AppChrome>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <header className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Compliance overview
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Monitor control health, open risks, and upcoming audit milestones in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {user?.role === 'superadmin' && (
              <Button
                as={Link}
                to="/admin"
                variant="outline"
                size="sm"
                className="cursor-pointer inline-flex items-center gap-1.5"
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                Super Admin
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="cursor-pointer">
              Export snapshot
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="cursor-pointer"
              onClick={handleAdminAction}
            >
              Run admin test action
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map(({ label, value, sub, accent }) => (
            <Card key={label} className="p-4 sm:p-6">
              <CardContent className="p-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
                <p className={`mt-1 text-xs ${accent}`}>{sub}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-teal-500" aria-hidden="true" />
                  Control coverage by framework
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">SOC 2</span>
                    <span>56 / 60 implemented</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-1.5 w-[93%] rounded-full bg-[var(--primary-color)]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-medium">ISO 27001</span>
                    <span>72 / 80 implemented</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-1.5 w-[90%] rounded-full bg-[var(--primary-color)]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <FileText className="h-4 w-4 text-teal-500" aria-hidden="true" />
                  Open tasks
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  {[
                    { title: 'Finalize access control policy', meta: 'Owner: Security · Due in 3 days', badge: 'High', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                    { title: 'Review vendor risk assessments', meta: 'Owner: Legal · Due in 6 days', badge: 'Medium', badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                    { title: 'Refresh incident response playbooks', meta: 'Owner: Operations · Due in 10 days', badge: 'Low', badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
                  ].map(({ title, meta, badge, badgeClass }) => (
                    <li
                      key={title}
                      className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{meta}</p>
                      </div>
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                        {badge}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Clock3 className="h-4 w-4 text-teal-500" aria-hidden="true" />
                  Recent activity
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  {[
                    { text: 'Evidence approved for vulnerability management', meta: '12 minutes ago · by Alex Rivera', dot: 'bg-teal-500' },
                    { text: 'New risk logged: third-party data processor', meta: '45 minutes ago · Assigned to Legal', dot: 'bg-[var(--primary-color)]' },
                    { text: 'Control failed: MFA enrollment threshold', meta: '2 hours ago · Owner notified', dot: 'bg-amber-500' },
                  ].map(({ text, meta, dot }) => (
                    <li key={text} className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{text}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{meta}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Admin sandbox
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Use the <span className="font-semibold">Run admin test action</span> button above to
                  validate role-based middleware and toast behavior without touching production data.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppChrome>
  );
};

export default Dashboard;
