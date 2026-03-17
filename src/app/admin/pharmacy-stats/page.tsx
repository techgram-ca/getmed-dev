'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RefreshCw, Filter, ChevronDown, ChevronRight, Building2, CheckCircle, XCircle, Package, Search, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

type DateFilter = 'today' | 'yesterday' | 'last_week' | 'last_month' | 'custom' | 'all';

interface PharmacyOrder {
  id: string;
  status: string;
  created_at: string;
  patient_name: string;
  patient_address: string;
}

interface PharmacyStat {
  pharmacy: { id: string; name: string; city?: string; address?: string };
  received: number;
  delivered: number;
  cancelled: number;
  failed: number;
  orders?: PharmacyOrder[];
}

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last 7 Days' },
  { value: 'last_month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
  { value: 'all', label: 'All Time' },
];

export default function AdminPharmacyStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PharmacyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [expandedPharmacy, setExpandedPharmacy] = useState<string | null>(null);
  const [pharmacyOrders, setPharmacyOrders] = useState<Record<string, PharmacyOrder[]>>({});
  const [loadingPharmacy, setLoadingPharmacy] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ date_filter: dateFilter });
    if (dateFilter === 'custom' && customDate) params.set('custom_date', customDate);
    if (nameSearch.trim()) params.set('name', nameSearch.trim());
    if (citySearch.trim()) params.set('city', citySearch.trim());
    return params.toString();
  }, [dateFilter, customDate, nameSearch, citySearch]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pharmacy-stats?${buildQuery()}`);
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

  const togglePharmacy = async (pharmacyId: string) => {
    if (expandedPharmacy === pharmacyId) { setExpandedPharmacy(null); return; }
    setExpandedPharmacy(pharmacyId);

    if (pharmacyOrders[pharmacyId]) return;

    setLoadingPharmacy(pharmacyId);
    try {
      const params = new URLSearchParams({ date_filter: dateFilter, pharmacy_id: pharmacyId });
      if (dateFilter === 'custom' && customDate) params.set('custom_date', customDate);
      const res = await fetch(`/api/admin/pharmacy-stats?${params}`);
      const data = await res.json();
      if (res.ok) {
        const found: PharmacyStat | undefined = (data.stats || []).find((s: PharmacyStat) => s.pharmacy.id === pharmacyId);
        setPharmacyOrders((prev) => ({ ...prev, [pharmacyId]: found?.orders || [] }));
      }
    } catch {
      toast.error('Failed to load pharmacy orders');
    } finally {
      setLoadingPharmacy(null);
    }
  };

  const handleFilterChange = (val: DateFilter) => {
    setDateFilter(val);
    setPharmacyOrders({});
    setExpandedPharmacy(null);
  };

  const handleSearch = () => {
    setPharmacyOrders({});
    setExpandedPharmacy(null);
    fetchStats();
  };

  const totals = stats.reduce(
    (acc, s) => ({ received: acc.received + s.received, delivered: acc.delivered + s.delivered, cancelled: acc.cancelled + s.cancelled, failed: acc.failed + s.failed }),
    { received: 0, delivered: 0, cancelled: 0, failed: 0 }
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Order Stats</h1>
          <p className="text-sm text-gray-500 mt-1">Track orders received and fulfilled per pharmacy</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Received', value: totals.received, icon: <Package size={20} className="text-indigo-600" />, color: 'bg-indigo-50' },
          { label: 'Delivered', value: totals.delivered, icon: <CheckCircle size={20} className="text-green-600" />, color: 'bg-green-50' },
          { label: 'Cancelled', value: totals.cancelled, icon: <XCircle size={20} className="text-gray-500" />, color: 'bg-gray-100' },
          { label: 'Failed', value: totals.failed, icon: <Truck size={20} className="text-red-500" />, color: 'bg-red-50' },
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
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
              onChange={(e) => { setCustomDate(e.target.value); setPharmacyOrders({}); setExpandedPharmacy(null); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      {/* Search filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Search size={15} className="text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-700 shrink-0">Filter:</span>
          <input
            type="text"
            placeholder="Pharmacy name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
          <input
            type="text"
            placeholder="City..."
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <Button size="sm" onClick={handleSearch}>Search</Button>
          {(nameSearch || citySearch) && (
            <button
              onClick={() => { setNameSearch(''); setCitySearch(''); setPharmacyOrders({}); setExpandedPharmacy(null); }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p>No pharmacies found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((s) => {
            const isExpanded = expandedPharmacy === s.pharmacy.id;
            const orders = pharmacyOrders[s.pharmacy.id] || [];
            const deliveryRate = s.received > 0 ? Math.round((s.delivered / s.received) * 100) : null;

            return (
              <div key={s.pharmacy.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Pharmacy row */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => togglePharmacy(s.pharmacy.id)}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-blue-600" />
                  </div>

                  {/* Name + city */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.pharmacy.name}</p>
                    {s.pharmacy.city && <p className="text-xs text-gray-400">{s.pharmacy.city}</p>}
                  </div>

                  {/* Stats chips */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{s.received}</p>
                      <p className="text-xs text-gray-400">Received</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{s.delivered}</p>
                      <p className="text-xs text-gray-400">Delivered</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-500">{s.cancelled}</p>
                      <p className="text-xs text-gray-400">Cancelled</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-500">{s.failed}</p>
                      <p className="text-xs text-gray-400">Failed</p>
                    </div>
                    {deliveryRate !== null && (
                      <div className={cn(
                        'px-2.5 py-1 rounded-lg text-sm font-semibold',
                        deliveryRate >= 90 ? 'bg-green-100 text-green-700' :
                        deliveryRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      )}>
                        {deliveryRate}%
                      </div>
                    )}
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded order list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {loadingPharmacy === s.pharmacy.id ? (
                      <div className="py-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-6">No orders in this period</p>
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
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">
                              {format(new Date(o.created_at), 'MMM d, HH:mm')}
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
