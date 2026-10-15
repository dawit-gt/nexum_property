export type BadgeTone = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  ACTIVE: 'default',
  AVAILABLE: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
  TERMINATED: 'destructive',
  EXPIRED: 'outline',
  RESERVED: 'secondary',
  OCCUPIED: 'secondary',
  MAINTENANCE: 'secondary',
  INACTIVE: 'outline',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'default',
};

export function toneForStatus(status: string): BadgeTone {
  return STATUS_TONES[status] ?? 'outline';
}