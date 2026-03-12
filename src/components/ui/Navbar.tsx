'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pill } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isPharmacyRoute = pathname?.startsWith('/pharmacy');
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) return null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Pill size={24} />
            GetMed
          </Link>

          <nav className="flex items-center gap-4">
            {!isPharmacyRoute && (
              <Link
                href="/pharmacy/register"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Join as Pharmacy
              </Link>
            )}
            {!isPharmacyRoute ? (
              <Link
                href="/pharmacy/login"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Pharmacy Login
              </Link>
            ) : (
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
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
