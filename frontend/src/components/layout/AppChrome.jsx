import Navbar from './Navbar';
import PublicFooter from './PublicFooter';

const AppChrome = ({ children, variant = 'app' }) => {
  const isLanding = variant === 'landing';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-black dark:text-gray-100">
      <Navbar variant={isLanding ? 'landing' : 'app'} />
      <main>{children}</main>
      {isLanding && <PublicFooter />}
    </div>
  );
};

export default AppChrome;
