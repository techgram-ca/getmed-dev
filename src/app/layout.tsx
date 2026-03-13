import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'GetMed – Prescription Delivery',
  description: 'Get your prescriptions delivered from nearby pharmacies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F2F7F6] min-h-screen font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
