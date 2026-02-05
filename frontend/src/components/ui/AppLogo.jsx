import { Link } from 'react-router-dom';

/**
 * Compliance 360 logo: "C" (first letter) in a primary-colored box.
 * Used in navbar and homepage.
 */
const AppLogo = ({ className = '', showText = true }) => (
  <Link
    to="/"
    className={`flex items-center gap-3 cursor-pointer ${className}`}
    aria-label="Compliance 360 home"
  >
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-color)] text-white font-bold text-lg shadow-sm ring-2 ring-teal-500/30 dark:ring-teal-400/30"
      aria-hidden="true"
    >
      C
    </div>
    {showText && (
      <div>
        <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
          Compliance 360
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Unified compliance workspace
        </p>
      </div>
    )}
  </Link>
);

export default AppLogo;
