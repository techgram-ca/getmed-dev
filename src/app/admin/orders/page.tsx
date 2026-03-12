'use client';

import { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';
import { format } from 'date-fns';
import { RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminOrder {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_address: string;
  order_type: string;
  status: string;
  created_at: string;
  pharmacy_id: string;
  pharmacies?: { id: string; name: string; city?: string };
}

interface PharmacyOption { id: string; name: string; }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    pharmacy_id: '',
    status: '',
    city: '',
    date: '',
  });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.pharmacy_id) params.set('pharmacy_id', filters.pharmacy_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.city) params.set('city', filters.city);
    if (filters.date) params.set('date', filters.date);
    return params.toString();
  }, [filters]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?${buildQuery()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    const loadPharmacies = async () => {
      const res = await fetch('/api/admin/pharmacies');
      const data = await res.json();
      setPharmacies((data.pharmacies || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    };
    loadPharmacies();
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders Monitoring</h1>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filters.pharmacy_id}
            onChange={(e) => updateFilter('pharmacy_id', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by city…"
            value={filters.city}
            onChange={(e) => updateFilter('city', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={filters.date}
            onChange={(e) => updateFilter('date', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          No orders found matching your filters
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Patient Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacy</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.patient_name}</p>
                      <p className="text-xs text-gray-400 max-w-[200px] truncate">{order.patient_address}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.patient_phone}</td>
                    <td className="px-4 py-3 text-gray-600">{order.pharmacies?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{order.pharmacies?.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-600">{order.order_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
