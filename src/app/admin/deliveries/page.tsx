'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Driver, Order } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';
import { format } from 'date-fns';
import { RefreshCw, Filter, Truck, MapPin, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryOrder extends Omit<Order, 'pharmacies' | 'drivers'> {
  pharmacies?: { id: string; name: string; address: string; city?: string };
  drivers?: { id: string; name: string; phone: string } | null;
}

interface PharmacyOption { id: string; name: string; }

export default function AdminDeliveriesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ pharmacy_id: '', city: '' });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ status: 'ready_for_delivery' });
    if (filters.pharmacy_id) params.set('pharmacy_id', filters.pharmacy_id);
    if (filters.city) params.set('city', filters.city);
    return params.toString();
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deliveries?${buildQuery()}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, router]);

  useEffect(() => {
    const loadSupporting = async () => {
      const [pharRes, drvRes] = await Promise.all([
        fetch('/api/admin/pharmacies'),
        fetch('/api/admin/drivers'),
      ]);
      const [pharData, drvData] = await Promise.all([pharRes.json(), drvRes.json()]);
      setPharmacies((pharData.pharmacies || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      setDrivers((drvData.drivers || []).filter((d: Driver) => d.status === 'approved' && !d.deleted_at));
    };
    loadSupporting();
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const assignDriver = async (orderId: string) => {
    const driverId = selectedDrivers[orderId];
    if (!driverId) {
      toast.error('Please select a driver first');
      return;
    }

    setAssigningId(orderId);
    try {
      const res = await fetch('/api/admin/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, driver_id: driverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Driver assigned successfully');
      // Update locally
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, ...data.order } : o
      ));
      setSelectedDrivers((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Assign approved drivers to orders that are ready for delivery</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
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
        <div className="grid grid-cols-2 gap-3">
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
          <input
            type="text"
            placeholder="Filter by city…"
            value={filters.city}
            onChange={(e) => updateFilter('city', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <Truck size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-purple-700">
            {orders.filter((o) => o.status === 'ready_for_delivery').length} Awaiting Assignment
          </span>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">
            {orders.filter((o) => o.status === 'assigned').length} Assigned
          </span>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <User size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {drivers.length} Available Driver{drivers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          <Truck size={40} className="text-gray-300 mx-auto mb-3" />
          <p>No orders ready for delivery</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                order.status === 'assigned' ? 'border-indigo-200' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{order.patient_name}</p>
                      <Badge className={ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                      <span className="text-xs text-gray-400 capitalize">{order.order_type}</span>
                    </div>

                    <div className="flex items-start gap-1 mb-1">
                      <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600">{order.patient_address}</p>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>
                        <strong className="text-gray-600">Pharmacy:</strong>{' '}
                        {order.pharmacies?.name}
                        {order.pharmacies?.city && `, ${order.pharmacies.city}`}
                      </span>
                      <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                    </div>

                    {/* Current driver */}
                    {order.drivers && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 w-fit">
                        <Truck size={13} />
                        <span>Assigned to <strong>{order.drivers.name}</strong> ({order.drivers.phone})</span>
                      </div>
                    )}
                  </div>

                  {/* Assignment control */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedDrivers[order.id] || ''}
                      onChange={(e) => setSelectedDrivers((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                    >
                      <option value="">
                        {order.status === 'assigned' ? 'Reassign driver…' : 'Select driver…'}
                      </option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Class {d.license_class})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      loading={assigningId === order.id}
                      onClick={() => assignDriver(order.id)}
                      disabled={!selectedDrivers[order.id]}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {order.status === 'assigned' ? 'Reassign' : 'Assign'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
