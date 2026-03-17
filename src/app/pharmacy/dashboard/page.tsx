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
import {
  LogOut, Package, Clock, Truck, CheckCircle, Eye, RefreshCw,
  CheckCircle2, XCircle, Calendar, Truck as TruckIcon, User, FileText, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

type DateFilter = 'all' | 'today' | 'yesterday' | 'last_week' | 'custom';

interface OrderWithDriver extends Omit<Order, 'drivers'> {
  drivers?: { id: string; name: string; phone: string } | null;
}

// Statuses pharmacy cannot act on (driver has taken over)
const DRIVER_LOCKED = new Set(['assigned', 'acknowledged', 'picked_up', 'out_for_delivery', 'delivered', 'delivery_failed']);

// Actions available per current status
function getPharmacyActions(status: string): { label: string; toStatus: string; variant: 'primary' | 'danger' | 'outline' }[] {
  if (status === 'pending') return [
    { label: 'Accept', toStatus: 'processing', variant: 'primary' },
    { label: 'Reject', toStatus: 'cancelled', variant: 'danger' },
  ];
  if (status === 'processing') return [
    { label: 'Mark Ready for Delivery', toStatus: 'ready_for_delivery', variant: 'primary' },
  ];
  if (status === 'ready_for_delivery') return [
    { label: 'Cancel Order', toStatus: 'cancelled', variant: 'danger' },
  ];
  return [];
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={ORDER_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}>
      {ORDER_STATUS_LABELS[status] || status}
    </Badge>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>{icon}</div>
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
  const [orders, setOrders] = useState<OrderWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDriver | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [totalStats, setTotalStats] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildOrdersQuery = useCallback((page = 1) => {
    const params = new URLSearchParams({ date_filter: dateFilter, page: String(page), page_size: '10' });
    if (dateFilter === 'custom' && customDate) params.set('custom_date', customDate);
    return params.toString();
  }, [dateFilter, customDate]);

  const fetchData = useCallback(async () => {
    try {
      const [pharmacyRes, ordersRes, statsRes] = await Promise.all([
        fetch('/api/pharmacies/me'),
        fetch(`/api/pharmacies/orders?${buildOrdersQuery(1)}`),
        fetch('/api/pharmacies/stats'),
      ]);

      if (pharmacyRes.status === 401) { router.push('/pharmacy/login'); return; }

      const pharmacyData = await pharmacyRes.json();
      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();
      setPharmacy(pharmacyData.pharmacy);
      setOrders(ordersData.orders || []);
      setTotalOrders(ordersData.total ?? ordersData.orders?.length ?? 0);
      setCurrentPage(1);
      setTotalStats(statsData.stats || {});
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router, buildOrdersQuery]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await fetch(`/api/pharmacies/orders?${buildOrdersQuery(nextPage)}`);
      const data = await res.json();
      setOrders((prev) => [...prev, ...(data.orders || [])]);
      setCurrentPage(nextPage);
    } catch {
      toast.error('Failed to load more orders');
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, buildOrdersQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      toast.success('Order updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
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
    } catch { toast.error('Failed to load image'); }
  };

  const loadDeliveryImage = async (path: string, key: string, orderId: string) => {
    if (imageUrls[key]) return;
    try {
      const res = await fetch(`/api/orders/delivery-image?path=${encodeURIComponent(path)}&order_id=${orderId}`);
      const data = await res.json();
      if (data.url) setImageUrls((prev) => ({ ...prev, [key]: data.url }));
    } catch { toast.error('Failed to load image'); }
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  // Stats always reflect ALL-TIME totals, independent of the date filter
  const stats = {
    pending: totalStats['pending'] ?? 0,
    processing: totalStats['processing'] ?? 0,
    ready: totalStats['ready_for_delivery'] ?? 0,
    delivered: totalStats['delivered'] ?? 0,
  };

  const hasMore = dateFilter === 'all' && orders.length < totalOrders;

  const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_week', label: 'Last 7 Days' },
    { value: 'custom', label: 'Custom Date' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (pharmacy?.status === 'pending') return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Pending Approval</h1>
      <p className="text-gray-500">Your pharmacy is awaiting admin approval.</p>
      <Button variant="ghost" className="mt-6" onClick={handleLogout}>Sign Out</Button>
    </div>
  );

  if (pharmacy?.status === 'rejected') return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-red-500 text-lg font-semibold mb-2">Registration Rejected</p>
      <p className="text-gray-500">Your pharmacy registration was not approved. Please contact support.</p>
      <Button variant="ghost" className="mt-6" onClick={handleLogout}>Sign Out</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <LogOut size={16} /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pending" value={stats.pending} icon={<Package size={20} className="text-yellow-600" />} color="bg-yellow-50" />
          <StatCard label="Processing" value={stats.processing} icon={<Clock size={20} className="text-blue-600" />} color="bg-blue-50" />
          <StatCard label="Ready for Delivery" value={stats.ready} icon={<Truck size={20} className="text-purple-600" />} color="bg-purple-50" />
          <StatCard label="Delivered" value={stats.delivered} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar size={16} className="text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700 shrink-0">Date:</span>
            <div className="flex gap-2 flex-wrap">
              {DATE_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setDateFilter(value); setCurrentPage(1); setOrders([]); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    dateFilter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {['all', 'pending', 'processing', 'ready_for_delivery', 'assigned', 'out_for_delivery', 'delivered', 'delivery_failed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0',
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? `All (${dateFilter === 'all' ? totalOrders : orders.length})` : ORDER_STATUS_LABELS[s]}
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
                    const actions = getPharmacyActions(order.status);
                    const isLocked = DRIVER_LOCKED.has(order.status);
                    return (
                      <tr key={order.id} className={cn(
                        'hover:bg-gray-50 transition-colors',
                        order.status === 'pending' && 'bg-yellow-50/30'
                      )}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{order.patient_name}</p>
                          <p className="text-xs text-gray-400">{order.patient_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-gray-600">{order.order_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                          {order.drivers && (
                            <p className="text-xs text-gray-400 mt-0.5">{order.drivers.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setImageUrls({}); }}>
                              <Eye size={14} /> View
                            </Button>
                            {!isLocked && actions.map((a) => (
                              <Button
                                key={a.toStatus}
                                size="sm"
                                variant={a.variant === 'danger' ? 'danger' : a.variant === 'outline' ? 'outline' : undefined}
                                loading={updatingId === order.id}
                                onClick={() => updateStatus(order.id, a.toStatus)}
                              >
                                {a.toStatus === 'processing' && <CheckCircle2 size={14} />}
                                {a.toStatus === 'cancelled' && <XCircle size={14} />}
                                {a.label}
                              </Button>
                            ))}
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

        {/* Load More — only visible in "All" mode */}
        {hasMore && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={loadMore} loading={loadingMore}>
              Load more orders ({orders.length} of {totalOrders})
            </Button>
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
                {selectedOrder.transfer_pharmacy_phone && <InfoRow label="Transfer Phone" value={selectedOrder.transfer_pharmacy_phone} />}
                {selectedOrder.transfer_medication_details && <InfoRow label="Medications" value={selectedOrder.transfer_medication_details} />}
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
                    <ImageIcon size={14} /> Load Prescription
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
                    <ImageIcon size={14} /> Load Insurance
                  </Button>
                )}
              </div>
            )}

            {/* Delivery Details (visible once delivered) */}
            {selectedOrder.status === 'delivered' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <TruckIcon size={16} /> Delivery Details
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.drivers && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Driver</p>
                        <p className="text-sm font-medium text-gray-900">{selectedOrder.drivers.name}</p>
                        <p className="text-xs text-gray-400">{selectedOrder.drivers.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Delivered At</p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(selectedOrder.delivered_at), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(selectedOrder.delivered_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOrder.delivery_notes && (
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Delivery Notes</p>
                      <p className="text-sm text-gray-900">{selectedOrder.delivery_notes}</p>
                    </div>
                  </div>
                )}

                {/* Proof of Delivery Photo */}
                {selectedOrder.delivery_photo_url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Proof of Delivery Photo</p>
                    {imageUrls['delivery_photo'] ? (
                      <img src={imageUrls['delivery_photo']} alt="Proof of Delivery" className="rounded-lg max-h-48 object-contain border border-gray-200" />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => loadDeliveryImage(selectedOrder.delivery_photo_url!, 'delivery_photo', selectedOrder.id)}>
                        <ImageIcon size={14} /> Load Proof Photo
                      </Button>
                    )}
                  </div>
                )}

                {/* Signature */}
                {selectedOrder.delivery_signature_url && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Patient Signature</p>
                    {imageUrls['signature'] ? (
                      <img src={imageUrls['signature']} alt="Signature" className="rounded-lg max-h-32 object-contain border border-gray-200" />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => loadDeliveryImage(selectedOrder.delivery_signature_url!, 'signature', selectedOrder.id)}>
                        <ImageIcon size={14} /> Load Signature
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status Actions */}
            {!DRIVER_LOCKED.has(selectedOrder.status) && getPharmacyActions(selectedOrder.status).length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {getPharmacyActions(selectedOrder.status).map((a) => (
                    <Button
                      key={a.toStatus}
                      size="sm"
                      variant={a.variant === 'danger' ? 'danger' : a.variant === 'outline' ? 'outline' : undefined}
                      loading={updatingId === selectedOrder.id}
                      onClick={() => updateStatus(selectedOrder.id, a.toStatus)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {DRIVER_LOCKED.has(selectedOrder.status) && selectedOrder.status !== 'delivered' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-700">
                This order is currently with the driver and cannot be modified.
              </div>
            )}
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
