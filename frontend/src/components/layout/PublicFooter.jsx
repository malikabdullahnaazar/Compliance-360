import { Link } from 'react-router-dom';

const footerLinks = [
  { label: 'Privacy', href: '#' },
  { label: 'Terms', href: '#' },
  { label: 'Contact', href: '#' },
];

const PublicFooter = () => (
  <footer className="bg-gray-900 text-gray-300">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-6 border-t border-gray-800 pt-8 sm:flex-row">
        <p className="text-sm font-semibold bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">
          Compliance 360
        </p>
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          {footerLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-gray-400 transition-colors hover:text-teal-400 cursor-pointer"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <p className="mt-6 text-center text-xs text-gray-400 sm:text-left">
        &copy; {new Date().getFullYear()} Compliance 360. All rights reserved.
      </p>
    </div>
  </footer>
);

export default PublicFooter;
