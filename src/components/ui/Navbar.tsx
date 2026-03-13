'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isPharmacyRoute = pathname?.startsWith('/pharmacy');
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) return null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3a3 3 0 0 1 3 3v1h1.5A1.5 1.5 0 0 1 16 8.5v7A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5v-7A1.5 1.5 0 0 1 5.5 7H7V6a3 3 0 0 1 3-3zm0 1.5A1.5 1.5 0 0 0 8.5 6v1h3V6A1.5 1.5 0 0 0 10 4.5zm0 6a1 1 0 0 0-1 1v1.5a1 1 0 0 0 2 0V11.5a1 1 0 0 0-1-1z"
                  fill="white"
                />
              </svg>
            </div>
            <span className="font-bold text-xl text-teal-500">GetMed</span>
          </Link>

          <nav className="flex items-center gap-6">
            {!isPharmacyRoute && (
              <>
                <a
                  href="#how-it-works"
                  className="text-sm text-gray-600 hover:text-teal-500 transition-colors hidden md:block"
                >
                  How It Works
                </a>
                <a
                  href="#why-getmed"
                  className="text-sm text-gray-600 hover:text-teal-500 transition-colors hidden md:block"
                >
                  Why GetMed
                </a>
                <Link
                  href="/pharmacy/register"
                  className="text-sm text-gray-600 hover:text-teal-500 transition-colors hidden md:block"
                >
                  For Pharmacies
                </Link>
              </>
            )}
            {!isPharmacyRoute ? (
              <Link
                href="/pharmacy/login"
                className="text-sm bg-teal-500 hover:bg-teal-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm"
              >
                Get Started
              </Link>
            ) : (
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-teal-500 transition-colors"
              >
                Patient Portal
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
