'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Driver, Order } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, DELIVERY_FAILURE_REASONS, cn } from '@/lib/utils';
import { MapPin, Phone, Package, CheckCircle, XCircle, Navigation, LogOut, Truck, Upload, Camera, FileSignature, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PharmacyGroup {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  pharmacyLat?: number;
  pharmacyLng?: number;
  orders: Order[];
}

type ModalMode = 'deliver' | 'fail' | null;

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PharmacyGroup[]>([]);

  // Delivery modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/driver/orders');
      if (res.status === 401 || res.status === 403) {
        router.push('/driver/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const orderList: Order[] = data.orders || [];
      setOrders(orderList);

      // Group by pharmacy
      const map = new Map<string, PharmacyGroup>();
      orderList.forEach((o) => {
        const pid = o.pharmacy_id;
        if (!map.has(pid)) {
          map.set(pid, {
            pharmacyId: pid,
            pharmacyName: o.pharmacies?.name || 'Unknown Pharmacy',
            pharmacyAddress: o.pharmacies?.address || '',
            pharmacyPhone: o.pharmacies?.phone || '',
            pharmacyLat: o.pharmacies?.latitude,
            pharmacyLng: o.pharmacies?.longitude,
            orders: [],
          });
        }
        map.get(pid)!.orders.push(o);
      });
      setGroups(Array.from(map.values()));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/driver/login'); return; }

      const res = await fetch('/api/drivers/me');
      if (!res.ok) { router.push('/driver/login'); return; }
      const d = await res.json();
      if (d.driver?.status !== 'approved') {
        toast.error('Your account is pending approval');
        await supabase.auth.signOut();
        router.push('/driver/login');
        return;
      }
      setDriver(d.driver);
      fetchOrders();
    };
    init();
  }, [router, fetchOrders]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/driver/login');
  };

  const acknowledge = async (orderId: string) => {
    const fd = new FormData();
    fd.append('order_id', orderId);
    fd.append('action', 'acknowledge');
    const res = await fetch('/api/driver/orders', { method: 'PATCH', body: fd });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success('Order acknowledged — out for delivery!');
    fetchOrders();
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const openDeliveryModal = (order: Order, mode: ModalMode) => {
    setSelectedOrder(order);
    setModalMode(mode);
    setDeliveryNotes('');
    setFailureReason('');
    setDeliveryPhoto(null);
    setSignaturePhoto(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedOrder(null);
  };

  const submitDelivery = async () => {
    if (!selectedOrder) return;
    if (modalMode === 'fail' && !failureReason) {
      toast.error('Please select a failure reason');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('order_id', selectedOrder.id);
      fd.append('action', modalMode === 'deliver' ? 'deliver' : 'fail');
      if (deliveryNotes) fd.append('delivery_notes', deliveryNotes);
      if (failureReason) fd.append('failure_reason', failureReason);
      if (deliveryPhoto) fd.append('delivery_photo', deliveryPhoto);
      if (signaturePhoto) fd.append('signature_photo', signaturePhoto);

      const res = await fetch('/api/driver/orders', { method: 'PATCH', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(modalMode === 'deliver' ? 'Order marked as delivered!' : 'Delivery failure recorded');
      closeModal();
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
            <Truck size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{driver?.name}</p>
            <p className="text-xs text-gray-500">@{driver?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No active deliveries</p>
            <p className="text-sm text-gray-400 mt-1">Check back when orders are assigned to you</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.pharmacyId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Pharmacy pickup header */}
                <div className="bg-teal-50 border-b border-teal-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Pickup Location</p>
                      <p className="font-bold text-gray-900">{group.pharmacyName}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <MapPin size={13} className="shrink-0" />
                        {group.pharmacyAddress}
                      </p>
                      {group.pharmacyPhone && (
                        <a
                          href={`tel:${group.pharmacyPhone}`}
                          className="text-sm text-teal-600 flex items-center gap-1 mt-0.5 hover:underline"
                        >
                          <Phone size={13} className="shrink-0" />
                          {group.pharmacyPhone}
                        </a>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMaps(group.pharmacyAddress)}
                      className="shrink-0 border-teal-300 text-teal-700 hover:bg-teal-100"
                    >
                      <Navigation size={14} />
                      Navigate
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-teal-600 font-medium">
                    {group.orders.length} delivery order{group.orders.length !== 1 ? 's' : ''} from this pharmacy
                  </div>
                </div>

                {/* Individual delivery orders */}
                <div className="divide-y divide-gray-100">
                  {group.orders.map((order) => (
                    <div key={order.id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{order.patient_name}</p>
                            <Badge className={ORDER_STATUS_COLORS[order.status]}>
                              {ORDER_STATUS_LABELS[order.status]}
                            </Badge>
                          </div>
                          <a
                            href={`tel:${order.patient_phone}`}
                            className="text-sm text-gray-600 flex items-center gap-1 hover:text-teal-600"
                          >
                            <Phone size={13} />
                            {order.patient_phone}
                          </a>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">
                          {format(new Date(order.created_at), 'MMM d')}
                        </p>
                      </div>

                      {/* Delivery address */}
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">{order.patient_address}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMaps(order.patient_address)}
                          className="shrink-0 text-xs"
                        >
                          <Navigation size={12} />
                          Maps
                        </Button>
                      </div>

                      {order.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs text-amber-700"><strong>Note:</strong> {order.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'assigned' && (
                          <Button
                            size="sm"
                            onClick={() => acknowledge(order.id)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            <CheckCircle size={14} />
                            Acknowledge
                          </Button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openDeliveryModal(order, 'deliver')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle size={14} />
                              Mark Delivered
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openDeliveryModal(order, 'fail')}
                            >
                              <XCircle size={14} />
                              Failed Delivery
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery / Failure Modal */}
      {modalMode && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'deliver' ? 'Complete Delivery' : 'Report Failed Delivery'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedOrder.patient_name} — {selectedOrder.patient_address}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {modalMode === 'deliver' ? 'Delivery Notes (optional)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                  placeholder={modalMode === 'deliver' ? 'Left at door, handed to patient, etc.' : 'Additional details...'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Failure reason */}
              {modalMode === 'fail' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Failure Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a reason</option>
                    {DELIVERY_FAILURE_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Proof photo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {modalMode === 'deliver' ? 'Proof of Delivery Photo (optional)' : 'Photo Evidence (optional)'}
                </label>
                <label className={cn(
                  'flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-teal-400 transition-colors',
                  deliveryPhoto ? 'border-teal-400 bg-teal-50' : 'border-gray-300'
                )}>
                  <Camera size={18} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 truncate">
                    {deliveryPhoto ? deliveryPhoto.name : 'Take or upload a photo'}
                  </span>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Signature */}
              {modalMode === 'deliver' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Patient Signature (optional)
                  </label>
                  <label className={cn(
                    'flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-teal-400 transition-colors',
                    signaturePhoto ? 'border-teal-400 bg-teal-50' : 'border-gray-300'
                  )}>
                    <FileSignature size={18} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 truncate">
                      {signaturePhoto ? signaturePhoto.name : 'Upload signature image'}
                    </span>
                    <input
                      ref={signatureRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setSignaturePhoto(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className={cn('flex-1', modalMode === 'deliver' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}
                onClick={submitDelivery}
                loading={submitting}
              >
                {modalMode === 'deliver' ? (
                  <><Upload size={14} /> Confirm Delivered</>
                ) : (
                  <><XCircle size={14} /> Report Failed</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
