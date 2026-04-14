import { Link } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../../context/AuthContext';

/**
 * CompliAI Chart logo: "C" (first letter) in a primary-colored box.
 * Used in navbar and homepage.
 */
const AppLogo = ({ className = '', showText = true }) => {
  const { user } = useContext(AuthContext);

  return (
    <Link
      to={user ? "/dashboard" : "/"}
      className={`flex items-center gap-3 cursor-pointer ${className}`}
      aria-label="CompliAI Chart home"
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
            CompliAI Chart
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unified compliance workspace
          </p>
        </div>
      )}
    </Link>
  );
};

export default AppLogo;
