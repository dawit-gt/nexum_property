'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#16a34a',
  OCCUPIED: '#0f172a',
  RESERVED: '#f59e0b',
  MAINTENANCE: '#dc2626',
  INACTIVE: '#94a3b8',
  PENDING: '#f59e0b',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
  ACTIVE: '#16a34a',
  SUSPENDED: '#dc2626',
  DEACTIVATED: '#94a3b8',
};

const FALLBACK_COLORS = ['#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

function labelFor(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** A donut of counts per status, with a legend underneath. */
export function StatusDonut({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).map(([status, value], index) => ({
    status,
    value,
    color: STATUS_COLORS[status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));
  const total = entries.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No data yet</p>
      ) : (
        <div className="relative mx-auto mt-2 h-40 w-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries.filter((e) => e.value > 0)}
                dataKey="value"
                nameKey="status"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                stroke="none"
              >
                {entries
                  .filter((e) => e.value > 0)
                  .map((e) => (
                    <Cell key={e.status} fill={e.color} />
                  ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-900">{total}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">total</span>
          </div>
        </div>
      )}

      <dl className="mt-3 space-y-1.5">
        {entries.map((e) => (
          <div key={e.status} className="flex items-center justify-between text-sm">
            <dt className="flex items-center gap-2 text-slate-600">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: e.color }} />
              {labelFor(e.status)}
            </dt>
            <dd className="font-semibold text-slate-900">{e.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
