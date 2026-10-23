'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface StatusOption {
  value: string;
  label: string;
}

interface DateRangeFieldsProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

/** From / To date inputs with a Clear button. */
export function DateRangeFields({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangeFieldsProps) {
  const hasDates = dateFrom !== '' || dateTo !== '';

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs text-slate-500">
        From
        <Input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-xs text-slate-500">
        To
        <Input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </label>
      {hasDates ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onDateFromChange('');
            onDateToChange('');
          }}
        >
          Clear dates
        </Button>
      ) : null}
    </div>
  );
}

interface ListToolbarProps extends DateRangeFieldsProps {
  /** Leave out both search props for lists that have nothing to search. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusOptions?: StatusOption[];
  status?: string;
  onStatusChange?: (value: string) => void;
}

/** Search box, status pills and a date range, shared by the admin lists. */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  statusOptions,
  status,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ListToolbarProps) {
  return (
    <div className="mt-4 space-y-3">
      {onSearchChange ? (
        <Input
          type="search"
          placeholder={searchPlaceholder}
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      ) : null}

      {statusOptions && onStatusChange ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1 text-sm',
                status === opt.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      <DateRangeFields
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  );
}

interface ListFooterProps {
  shown: number;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/** "Showing 10 of 42" plus a Load more button. */
export function ListFooter({ shown, total, hasMore, isLoadingMore, onLoadMore }: ListFooterProps) {
  if (total === 0) return null;

  return (
    <div className="mt-4 space-y-2 text-center">
      <p className="text-xs text-slate-400">
        Showing {shown} of {total}
      </p>
      {hasMore ? (
        <Button type="button" variant="outline" className="w-full" disabled={isLoadingMore} onClick={onLoadMore}>
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}