export type DueDateStatus = 'no-date' | 'overdue' | 'due-now' | 'due-soon' | 'upcoming';
export type DueDateTone = 'muted' | 'danger' | 'warning' | 'caution' | 'success';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function getDueDateStatus(dueAt: string | null, now = new Date()): DueDateStatus {
  if (!dueAt) {
    return 'no-date';
  }

  const dueDate = new Date(dueAt);
  const diffHours = Math.floor((dueDate.getTime() - now.getTime()) / HOUR_MS);
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);

  if (diffDays < 0 || diffHours < 0) {
    return 'overdue';
  }

  if (diffHours === 0) {
    return 'due-now';
  }

  if (diffDays <= 3) {
    return 'due-soon';
  }

  return 'upcoming';
}

export function formatRelativeDueDate(dueAt: string | null, now = new Date()): string {
  if (!dueAt) {
    return 'No due date';
  }

  const dueDate = new Date(dueAt);
  const diffTime = dueDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffTime / HOUR_MS);
  const diffDays = Math.ceil(diffTime / DAY_MS);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) {
    if (diffHours < 0) return 'Overdue';
    if (diffHours === 0) return 'Due now';
    if (diffHours === 1) return 'Due in 1 hour';
    return `Due in ${diffHours} hours`;
  }
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  if (diffWeeks < 4) return `Due in ${diffWeeks} week${diffWeeks === 1 ? '' : 's'}`;

  return dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: dueDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function getDueDateTone(dueAt: string | null, now = new Date()): DueDateTone {
  const status = getDueDateStatus(dueAt, now);
  if (status === 'no-date') return 'muted';
  if (status === 'overdue') return 'danger';
  if (status === 'due-now') return 'warning';
  if (status === 'due-soon') return 'caution';
  return 'success';
}
