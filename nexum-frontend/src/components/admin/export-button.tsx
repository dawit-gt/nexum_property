'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';
import { downloadCsv } from '@/lib/api/export';

interface ExportButtonProps {
  /** The export endpoint, e.g. /dashboard/payments/export */
  path: string;
  /** The filters currently applied to the list on screen. */
  params: Record<string, string | undefined>;
  /** Start of the downloaded file name, e.g. "payments". */
  filenameBase: string;
  label?: string;
}

export function ExportButton({ path, params, filenameBase, label = 'Export CSV' }: ExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadCsv(path, params, filenameBase);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handleClick}>
        {busy ? 'Preparing...' : label}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}