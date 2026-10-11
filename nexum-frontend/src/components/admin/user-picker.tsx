'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { listUsers } from '@/lib/api/admin-users';
import { cn } from '@/lib/utils';
import type { SafeUser } from '@/types/api';

interface UserPickerProps {
  mode: 'single' | 'multi';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function UserPicker({ mode, selectedIds, onChange }: UserPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      listUsers({ page: 1, limit: 10, search: search || undefined, registrationStatus: 'APPROVED' })
        .then((result) => setResults(result.data))
        .finally(() => setIsLoading(false));
    }, 250); // debounce — avoid firing a request on every keystroke
    return () => clearTimeout(timeout);
  }, [search]);

  const toggle = (id: string) => {
    if (mode === 'single') {
      onChange([id]);
      return;
    }
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div>
      <Input placeholder="Search tenants by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {selectedIds.length > 0 ? (
        <p className="mt-1.5 text-xs text-slate-500">
          {selectedIds.length} selected
        </p>
      ) : null}

      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
        {isLoading ? (
          <p className="p-2 text-sm text-slate-400">Searching...</p>
        ) : results.length === 0 ? (
          <p className="p-2 text-sm text-slate-400">No matching tenants.</p>
        ) : (
          results.map((u) => {
            const checked = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                  checked ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span>
                  {u.firstName} {u.lastName}
                  <span className={cn('ml-1.5 text-xs', checked ? 'text-slate-300' : 'text-slate-400')}>
                    {u.email}
                  </span>
                </span>
                {checked ? <span>✓</span> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}