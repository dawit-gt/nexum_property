'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusOption = {
  value: string;
  label: string;
};

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusOptions: StatusOption[];
  status: string;
  onStatusChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusOptions,
  status,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ListToolbarProps) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="sm:max-w-xs"
      />

      <Select
        value={status}
        onValueChange={(value) => {
          if (value !== null) onStatusChange(value);
        }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-[140px]"
          aria-label="From date"
        />
        <span className="text-sm text-slate-400">–</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-[140px]"
          aria-label="To date"
        />
      </div>
    </div>
  );
}

type ListFooterProps = {
  shown: number;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function ListFooter({
  shown,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ListFooterProps) {
  if (total === 0) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-sm text-slate-500">
        Showing {shown} of {total}
      </p>
      {hasMore ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}