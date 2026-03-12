'use client';

import { useEffect, useState } from 'react';
import { Pharmacy } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PHARMACY_STATUS_COLORS } from '@/lib/utils';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPharmacies = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/pharmacies');
    const data = await res.json();
    setPharmacies(data.pharmacies || []);
    setLoading(false);
  };

  useEffect(() => { fetchPharmacies(); }, []);

  const performAction = async (id: string, action: string) => {
    setActionId(id);
    try {
      let res;
      if (action === 'delete') {
        res = await fetch(`/api/admin/pharmacies?id=${id}`, { method: 'DELETE' });
      } else {
        res = await fetch('/api/admin/pharmacies', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Pharmacy ${action}d`);
      fetchPharmacies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'all'
    ? pharmacies.filter((p) => !p.deleted_at)
    : filter === 'deleted'
    ? pharmacies.filter((p) => p.deleted_at)
    : pharmacies.filter((p) => p.status === filter && !p.deleted_at);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy Management</h1>
        <Button variant="outline" size="sm" onClick={fetchPharmacies}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'approved', 'rejected', 'suspended', 'deleted'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-500">
          No pharmacies found
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacy</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{p.phone}</p>
                    {p.emergency_contact && (
                      <p className="text-xs text-gray-400">Emrg: {p.emergency_contact}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 max-w-[160px] truncate">{p.address}</p>
                    {p.city && <p className="text-xs text-gray-400">{p.city}, {p.province}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PHARMACY_STATUS_COLORS[p.status]}>
                      {p.status}
                    </Badge>
                    {p.deleted_at && <Badge className="ml-1 bg-red-100 text-red-700">Deleted</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!p.deleted_at && (
                        <>
                          {p.status !== 'approved' && (
                            <Button
                              size="sm"
                              loading={actionId === p.id}
                              onClick={() => performAction(p.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle size={14} />
                              Approve
                            </Button>
                          )}
                          {p.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={actionId === p.id}
                              onClick={() => performAction(p.id, 'reject')}
                            >
                              <XCircle size={14} />
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={actionId === p.id}
                            onClick={() => {
                              if (confirm(`Soft-delete "${p.name}"? This will remove them from search results.`)) {
                                performAction(p.id, 'delete');
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
