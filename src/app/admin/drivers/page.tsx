'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Driver } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DRIVER_STATUS_COLORS } from '@/lib/utils';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDriversPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/drivers');
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load drivers');
      setDrivers(data.drivers || []);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const performAction = async (id: string, action: string) => {
    setActionId(id);
    try {
      let res;
      if (action === 'delete') {
        res = await fetch(`/api/admin/drivers?id=${id}`, { method: 'DELETE' });
      } else {
        res = await fetch('/api/admin/drivers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Driver ${action === 'delete' ? 'removed' : action + 'd'}`);
      fetchDrivers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
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
          <RefreshCw size={14} />
          Refresh
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
                    <Badge className={DRIVER_STATUS_COLORS[d.status]}>
                      {d.status}
                    </Badge>
                    {d.deleted_at && <Badge className="ml-1 bg-red-100 text-red-700">Deleted</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {format(new Date(d.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!d.deleted_at && (
                        <>
                          {d.status !== 'approved' && (
                            <Button
                              size="sm"
                              loading={actionId === d.id}
                              onClick={() => performAction(d.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle size={14} />
                              Approve
                            </Button>
                          )}
                          {d.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={actionId === d.id}
                              onClick={() => performAction(d.id, 'reject')}
                            >
                              <XCircle size={14} />
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={actionId === d.id}
                            onClick={() => {
                              if (confirm(`Remove driver "${d.name}"?`)) {
                                performAction(d.id, 'delete');
                              }
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
