'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PlatformSettings } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const s: PlatformSettings[] = data.settings || [];
      setSettings(s);
      setValues(Object.fromEntries(s.map((x) => [x.key, x.value])));
      setLoading(false);
    };
    load();
  }, []);

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: values[key] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings((prev) => prev.map((s) => s.key === key ? { ...s, ...data.setting } : s));
      toast.success('Setting saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
      </div>

      <div className="max-w-xl space-y-5">
        {settings.map((setting) => {
          const s = settings.find((x) => x.key === setting.key)!;
          return (
            <div key={setting.key} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {setting.key.replace(/_/g, ' ')}
                </h3>
                {setting.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{setting.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {format(new Date(s.updated_at), 'PPP p')}
                </p>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Value"
                    value={values[setting.key] || ''}
                    onChange={(e) => setValues((v) => ({ ...v, [setting.key]: e.target.value }))}
                    hint={setting.key === 'search_radius_km' ? 'Distance in kilometers' : undefined}
                  />
                </div>
                <Button
                  loading={saving === setting.key}
                  onClick={() => saveSetting(setting.key)}
                  disabled={values[setting.key] === setting.value}
                >
                  Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
