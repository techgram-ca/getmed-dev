'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Driver, DriverStatus } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { DRIVER_STATUS_COLORS } from '@/lib/utils';
import { format } from 'date-fns';
import { Pencil, Trash2, RefreshCw, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState<string | null>(null);

  // Edit modal
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [editStatus, setEditStatus] = useState<DriverStatus>('pending');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/drivers');
      const data = await res.json();
      if (res.status === 401 || res.status === 403) { router.push('/admin/login'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to load drivers');
      setDrivers(data.drivers || []);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const openEdit = (d: Driver) => { setEditDriver(d); setEditStatus(d.status); };
  const closeEdit = () => { setEditDriver(null); };

  const saveEdit = async () => {
    if (!editDriver) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editDriver.id, action: editStatus === 'approved' ? 'approve' : editStatus === 'rejected' ? 'reject' : 'pending' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Driver status updated');
      closeEdit();
      fetchDrivers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteDriver = async (reason?: string) => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/drivers?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Driver removed');
      setDeleteTarget(null);
      fetchDrivers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'all'
    ? drivers.filter((d) => !d.deleted_at)
    : filter === 'deleted'
    ? drivers.filter((d) => d.deleted_at)
    : drivers.filter((d) => d.status === filter && !d.deleted_at);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
        <Button variant="outline" size="sm" onClick={fetchDrivers}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'rejected', 'deleted'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
            {s === 'pending' && (
              <span className="ml-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {drivers.filter((d) => d.status === 'pending' && !d.deleted_at).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p className="font-medium">Failed to load drivers</p>
            <p className="text-sm text-red-600 mt-0.5">{fetchError}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchDrivers}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          {filter === 'pending' ? 'No drivers pending approval' : 'No drivers found'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">License</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Age</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Applied</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => (
                <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${d.status === 'pending' ? 'bg-yellow-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-400">@{d.username}</p>
                    <p className="text-xs text-gray-400">{d.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{d.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{d.license_number}</p>
                    <p className="text-xs text-gray-400">Class {d.license_class}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.age}</td>
                  <td className="px-4 py-3">
                    <Badge className={DRIVER_STATUS_COLORS[d.status]}>{d.status}</Badge>
                    {d.deleted_at && <Badge className="ml-1 bg-red-100 text-red-700">Deleted</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {format(new Date(d.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    {!d.deleted_at && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                          <Pencil size={13} /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={actionId === d.id}
                          onClick={() => setDeleteTarget(d)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Edit Driver</h2>
              <button onClick={closeEdit} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{editDriver.name}</p>
                <p className="text-xs text-gray-400">@{editDriver.username} · {editDriver.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
                <div className="flex gap-2">
                  {(['pending', 'approved', 'rejected'] as DriverStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                        editStatus === s
                          ? s === 'approved' ? 'bg-green-600 text-white border-green-600'
                            : s === 'rejected' ? 'bg-red-600 text-white border-red-600'
                            : 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeEdit}>Cancel</Button>
              <Button className="flex-1" onClick={saveEdit} loading={editSaving}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Remove Driver"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Remove Driver"
        variant="danger"
        requireReason={true}
        reasonLabel="Reason for removal"
        reasonPlaceholder="Enter reason for removing this driver..."
        onConfirm={deleteDriver}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
