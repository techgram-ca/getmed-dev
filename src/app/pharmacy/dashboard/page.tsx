'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Order, Pharmacy } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { LogOut, Package, Clock, Truck, CheckCircle, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_SEQUENCE = ['pending', 'processing', 'ready_for_delivery', 'delivered'] as const;

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={ORDER_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}>
      {ORDER_STATUS_LABELS[status] || status}
    </Badge>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4')}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function PharmacyDashboard() {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const [pharmacyRes, ordersRes] = await Promise.all([
        fetch('/api/pharmacies/me'),
        fetch('/api/pharmacies/orders'),
      ]);

      if (pharmacyRes.status === 401) {
        router.push('/pharmacy/login');
        return;
      }

      const pharmacyData = await pharmacyRes.json();
      const ordersData = await ordersRes.json();

      setPharmacy(pharmacyData.pharmacy);
      setOrders(ordersData.orders || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/pharmacy/login');
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: data.order.status } : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder((o) => o ? { ...o, status: data.order.status } : o);
      toast.success('Order status updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const loadImage = async (bucket: string, path: string, key: string) => {
    if (imageUrls[key]) return;
    try {
      const res = await fetch(`/api/pharmacies/orders/image?bucket=${bucket}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.url) setImageUrls((prev) => ({ ...prev, [key]: data.url }));
    } catch {
      toast.error('Failed to load image');
    }
  };

  const getNextStatus = (current: string) => {
    const idx = STATUS_SEQUENCE.indexOf(current as typeof STATUS_SEQUENCE[number]);
    return idx >= 0 && idx < STATUS_SEQUENCE.length - 1 ? STATUS_SEQUENCE[idx + 1] : null;
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    ready: orders.filter((o) => o.status === 'ready_for_delivery').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pharmacy?.status === 'pending') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pending Approval</h1>
        <p className="text-gray-500">Your pharmacy is awaiting admin approval. You will be notified by email once approved.</p>
        <Button variant="ghost" className="mt-6" onClick={handleLogout}>Sign Out</Button>
      </div>
    );
  }

  if (pharmacy?.status === 'rejected') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-red-500 text-lg font-semibold mb-2">Registration Rejected</p>
        <p className="text-gray-500">Your pharmacy registration was not approved. Please contact support.</p>
        <Button variant="ghost" className="mt-6" onClick={handleLogout}>Sign Out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{pharmacy?.name}</h1>
            <p className="text-xs text-gray-400">{pharmacy?.address}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={18} />
            </button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending" value={stats.pending} icon={<Package size={20} className="text-yellow-600" />} color="bg-yellow-50" />
          <StatCard label="Processing" value={stats.processing} icon={<Clock size={20} className="text-blue-600" />} color="bg-blue-50" />
          <StatCard label="Ready for Delivery" value={stats.ready} icon={<Truck size={20} className="text-purple-600" />} color="bg-purple-50" />
          <StatCard label="Delivered" value={stats.delivered} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto">
          {['all', 'pending', 'processing', 'ready_for_delivery', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? 'All Orders' : ORDER_STATUS_LABELS[s]}
              {s === 'all' && orders.length > 0 && (
                <span className="ml-2 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Package size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((order) => {
                    const nextStatus = getNextStatus(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{order.patient_name}</p>
                          <p className="text-xs text-gray-400">{order.patient_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-600">{order.order_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye size={14} />
                              View
                            </Button>
                            {nextStatus && order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                loading={updatingId === order.id}
                                onClick={() => updateStatus(order.id, nextStatus)}
                              >
                                → {ORDER_STATUS_LABELS[nextStatus]}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => { setSelectedOrder(null); setImageUrls({}); }}
        title="Order Details"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Order ID</p>
                <p className="font-mono text-sm">{selectedOrder.id}</p>
              </div>
              <OrderStatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Patient Name" value={selectedOrder.patient_name} />
              <InfoRow label="Phone" value={selectedOrder.patient_phone} />
              <InfoRow label="Email" value={selectedOrder.patient_email} />
              <InfoRow label="Health Card" value={selectedOrder.health_card_number || '—'} />
              <InfoRow label="Order Type" value={selectedOrder.order_type.toUpperCase()} />
              <InfoRow label="Date" value={format(new Date(selectedOrder.created_at), 'PPP p')} />
            </div>

            <InfoRow label="Delivery Address" value={selectedOrder.patient_address} />

            {selectedOrder.order_type === 'otc' && selectedOrder.otc_medications && (
              <InfoRow label="OTC Medications" value={selectedOrder.otc_medications} />
            )}

            {selectedOrder.order_type === 'transfer' && (
              <div className="space-y-2">
                <InfoRow label="Transfer From" value={selectedOrder.transfer_pharmacy_name || '—'} />
                {selectedOrder.transfer_pharmacy_phone && (
                  <InfoRow label="Transfer Pharmacy Phone" value={selectedOrder.transfer_pharmacy_phone} />
                )}
                {selectedOrder.transfer_medication_details && (
                  <InfoRow label="Medications" value={selectedOrder.transfer_medication_details} />
                )}
              </div>
            )}

            {/* Prescription Image */}
            {selectedOrder.prescription_image_url && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Prescription</p>
                {imageUrls['prescription'] ? (
                  <img src={imageUrls['prescription']} alt="Prescription" className="rounded-lg max-h-64 object-contain border border-gray-200" />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => loadImage('prescriptions', selectedOrder.prescription_image_url!, 'prescription')}>
                    Load Prescription Image
                  </Button>
                )}
              </div>
            )}

            {/* Insurance Image */}
            {selectedOrder.insurance_image_url && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Insurance Card</p>
                {imageUrls['insurance'] ? (
                  <img src={imageUrls['insurance']} alt="Insurance" className="rounded-lg max-h-64 object-contain border border-gray-200" />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => loadImage('insurance-cards', selectedOrder.insurance_image_url!, 'insurance')}>
                    Load Insurance Image
                  </Button>
                )}
              </div>
            )}

            {/* Status Update */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_SEQUENCE.filter((s) => s !== selectedOrder.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    loading={updatingId === selectedOrder.id}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </Button>
                ))}
                {selectedOrder.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={updatingId === selectedOrder.id}
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
