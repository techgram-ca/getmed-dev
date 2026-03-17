'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RefreshCw, Filter, ChevronDown, ChevronRight, Truck, CheckCircle, XCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';

type DateFilter = 'today' | 'yesterday' | 'last_week' | 'last_month' | 'custom' | 'all';

interface DriverOrder {
  id: string;
  status: string;
  delivered_at?: string;
  created_at: string;
  patient_name: string;
  patient_address: string;
  pharmacies?: { name: string; city?: string };
}

interface DriverStat {
  driver: { id: string; name: string; username: string; phone: string; email: string; license_class: string };
  delivered: number;
  failed: number;
  total: number;
  orders?: DriverOrder[];
}

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last 7 Days' },
  { value: 'last_month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
  { value: 'all', label: 'All Time' },
];

export default function AdminDriverStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DriverStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState('');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverOrders, setDriverOrders] = useState<Record<string, DriverOrder[]>>({});
  const [loadingDriver, setLoadingDriver] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ date_filter: dateFilter });
    if (dateFilter === 'custom' && customDate) params.set('custom_date', customDate);
    return params.toString();
  }, [dateFilter, customDate]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/driver-stats?${buildQuery()}`);
      if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.stats || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const toggleDriver = async (driverId: string) => {
    if (expandedDriver === driverId) { setExpandedDriver(null); return; }
    setExpandedDriver(driverId);

    if (driverOrders[driverId]) return; // already loaded

    setLoadingDriver(driverId);
    try {
      const params = new URLSearchParams({ date_filter: dateFilter, driver_id: driverId });
      if (dateFilter === 'custom' && customDate) params.set('custom_date', customDate);
      const res = await fetch(`/api/admin/driver-stats?${params}`);
      const data = await res.json();
      if (res.ok) {
        const driversData: DriverStat[] = data.stats || [];
        const found = driversData.find((s) => s.driver.id === driverId);
        setDriverOrders((prev) => ({ ...prev, [driverId]: found?.orders || [] }));
      }
    } catch {
      toast.error('Failed to load driver orders');
    } finally {
      setLoadingDriver(null);
    }
  };

  // Clear cached driver orders when filter changes so they reload
  const handleFilterChange = (val: DateFilter) => {
    setDateFilter(val);
    setDriverOrders({});
    setExpandedDriver(null);
  };

  const totals = stats.reduce(
    (acc, s) => ({ delivered: acc.delivered + s.delivered, failed: acc.failed + s.failed, total: acc.total + s.total }),
    { delivered: 0, failed: 0, total: 0 }
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Delivery Stats</h1>
          <p className="text-sm text-gray-500 mt-1">Track completed deliveries per driver</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Completions', value: totals.total, icon: <Truck size={20} className="text-indigo-600" />, color: 'bg-indigo-50' },
          { label: 'Delivered', value: totals.delivered, icon: <CheckCircle size={20} className="text-green-600" />, color: 'bg-green-50' },
          { label: 'Failed', value: totals.failed, icon: <XCircle size={20} className="text-red-500" />, color: 'bg-red-50' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700 shrink-0">Period:</span>
          <div className="flex gap-2 flex-wrap">
            {DATE_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  dateFilter === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => { setCustomDate(e.target.value); setDriverOrders({}); setExpandedDriver(null); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          <User size={40} className="text-gray-300 mx-auto mb-3" />
          <p>No approved drivers found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((s) => {
            const isExpanded = expandedDriver === s.driver.id;
            const orders = driverOrders[s.driver.id] || [];
            const successRate = s.total > 0 ? Math.round((s.delivered / s.total) * 100) : null;

            return (
              <div key={s.driver.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Driver row */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggleDriver(s.driver.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <User size={18} className="text-indigo-600" />
                  </div>

                  {/* Name + info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.driver.name}</p>
                    <p className="text-xs text-gray-400">@{s.driver.username} · Class {s.driver.license_class} · {s.driver.phone}</p>
                  </div>

                  {/* Stats chips */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{s.total}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{s.delivered}</p>
                      <p className="text-xs text-gray-400">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-500">{s.failed}</p>
                      <p className="text-xs text-gray-400">Failed</p>
                    </div>
                    {successRate !== null && (
                      <div className={cn(
                        'px-2.5 py-1 rounded-lg text-sm font-semibold',
                        successRate >= 90 ? 'bg-green-100 text-green-700' :
                        successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      )}>
                        {successRate}%
                      </div>
                    )}
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded order list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {loadingDriver === s.driver.id ? (
                      <div className="py-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-6">No deliveries in this period</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {orders.map((o) => (
                          <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                            <Badge className={ORDER_STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}>
                              {ORDER_STATUS_LABELS[o.status] || o.status}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{o.patient_name}</p>
                              <p className="text-xs text-gray-400 truncate">{o.patient_address}</p>
                              {o.pharmacies && (
                                <p className="text-xs text-gray-400">From: {o.pharmacies.name}{o.pharmacies.city ? `, ${o.pharmacies.city}` : ''}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">
                              {o.delivered_at
                                ? format(new Date(o.delivered_at), 'MMM d, HH:mm')
                                : format(new Date(o.created_at), 'MMM d')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
