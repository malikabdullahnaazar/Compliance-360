import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, BarChart3 } from 'lucide-react';
import AppChrome from '../components/layout/AppChrome';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const HeroWave = () => (
  <svg
    className="absolute bottom-0 left-0 w-full h-16 text-white dark:text-gray-900"
    viewBox="0 0 1440 64"
    fill="currentColor"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path d="M0 64h1440V32C1200 0 960 0 720 32 480 64 240 64 0 32v32z" />
  </svg>
);

const Home = () => (
  <AppChrome variant="landing">
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute right-[10%] top-[40%] h-96 w-96 rounded-full bg-teal-300/15 blur-3xl dark:bg-teal-600/10" />
        <div className="absolute bottom-[20%] left-[40%] h-64 w-64 rounded-full bg-indigo-300/10 blur-3xl dark:bg-indigo-500/5" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-100 to-teal-200 px-4 py-1.5 text-sm font-medium text-teal-800 dark:from-teal-900/30 dark:to-teal-800/30 dark:text-teal-200">
            Audit-ready in weeks, not months
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="block">Modern compliance</span>
            <span className="block bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent dark:from-teal-400 dark:to-teal-500">
              for regulated teams
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
            Centralize policies, automate evidence collection, and surface real-time risk
            insights in a single, secure workspace designed for compliance leaders.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button as={Link} to="/login" variant="primary" size="lg" className="cursor-pointer">
              Get Started
            </Button>
            <Button as={Link} to="/login" variant="outline" size="lg" className="cursor-pointer">
              Sign In
            </Button>
          </div>
        </div>
      </div>
      <HeroWave />
    </section>

    <section className="bg-white dark:bg-gray-900 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-gradient-to-r from-teal-100 to-teal-200 px-4 py-1.5 text-sm font-medium text-teal-800 dark:from-teal-900/30 dark:to-teal-800/30 dark:text-teal-200">
            Platform capabilities
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
            Everything you need to stay compliant
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 sm:text-xl max-w-xl mx-auto">
            Replace spreadsheets and one-off tools with a single workspace for controls,
            evidence, and audits.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Real-time monitoring',
              body:
                'Stream live control health, failed checks, and remediation owners from a single dashboard.',
            },
            {
              icon: Lock,
              title: 'Enterprise-grade security',
              body:
                'Role-based access, SSO, and encryption by default so sensitive evidence stays fully protected.',
            },
            {
              icon: BarChart3,
              title: 'Automated reporting',
              body:
                'Generate board-ready reports and auditor exports in a few clicks, always backed by live data.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="group relative overflow-hidden rounded-2xl p-6 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-transparent dark:from-teal-900/20 dark:to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                  {title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">
                  {body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 dark:from-teal-700 dark:via-teal-800 dark:to-teal-900 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Ready to simplify compliance?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-teal-100">
          Join teams that ship audit-ready programs faster with Compliance 360.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Button as={Link} to="/login" variant="primary" size="lg" className="cursor-pointer bg-white/10 from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white border border-white/30">
            Start Free Trial
          </Button>
          <Button as={Link} to="/login" variant="outline" size="lg" className="cursor-pointer border-2 border-white text-white hover:bg-white hover:text-teal-800">
            View Pricing
          </Button>
        </div>
        <p className="mt-6 text-sm text-teal-200">
          No credit card required. SOC 2, ISO 27001, GDPR, HIPAA.
        </p>
      </div>
    </section>
  </AppChrome>
);

export default Home;
