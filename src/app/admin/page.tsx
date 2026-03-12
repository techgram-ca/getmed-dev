'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ClipboardList, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalPharmacies: number;
  pendingPharmacies: number;
  totalOrders: number;
  pendingOrders: number;
}

function StatCard({ label, value, icon, href, color }: {
  label: string; value: number; icon: React.ReactNode; href: string; color: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

export default function AdminOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ totalPharmacies: 0, pendingPharmacies: 0, totalOrders: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pharRes, ordRes] = await Promise.all([
          fetch('/api/admin/pharmacies'),
          fetch('/api/admin/orders'),
        ]);

        if (pharRes.status === 401 || pharRes.status === 403) {
          router.push('/admin/login');
          return;
        }

        const [pharData, ordData] = await Promise.all([pharRes.json(), ordRes.json()]);
        const pharmacies = pharData.pharmacies || [];
        const orders = ordData.orders || [];
        setStats({
          totalPharmacies: pharmacies.length,
          pendingPharmacies: pharmacies.filter((p: { status: string }) => p.status === 'pending').length,
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: { status: string }) => o.status === 'pending').length,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Pharmacies" value={stats.totalPharmacies} href="/admin/pharmacies" color="bg-blue-50" icon={<Building2 size={22} className="text-blue-600" />} />
        <StatCard label="Pending Approval" value={stats.pendingPharmacies} href="/admin/pharmacies" color="bg-yellow-50" icon={<Clock size={22} className="text-yellow-600" />} />
        <StatCard label="Total Orders" value={stats.totalOrders} href="/admin/orders" color="bg-purple-50" icon={<ClipboardList size={22} className="text-purple-600" />} />
        <StatCard label="Pending Orders" value={stats.pendingOrders} href="/admin/orders" color="bg-green-50" icon={<CheckCircle size={22} className="text-green-600" />} />
      </div>
    </div>
  );
}
