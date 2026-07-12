import type {
  AssignmentStatus,
  AssignmentStatusFilter,
  NormalizedAssignment,
} from '../types';

export type AssignmentStatusCounts = Record<AssignmentStatusFilter, number>;

export interface AssignmentFilterOptions {
  selectedCourseId?: number | null;
  searchQuery?: string;
  statusFilter?: AssignmentStatusFilter;
  now?: Date;
}

export function filterAndSortAssignments(
  assignments: NormalizedAssignment[],
  options: AssignmentFilterOptions = {},
): NormalizedAssignment[] {
  const {
    selectedCourseId = null,
    searchQuery = '',
    statusFilter = 'all',
    now = new Date(),
  } = options;

  let filtered = assignments.filter(isPublishedAssignment);

  if (selectedCourseId) {
    filtered = filtered.filter((assignment) => assignment.courseId === selectedCourseId);
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    filtered = filtered.filter((assignment) =>
      assignment.name.toLowerCase().includes(normalizedQuery),
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(
      (assignment) => getAssignmentStatus(assignment, now) === statusFilter,
    );
  }

  return filtered.sort(compareAssignmentDates);
}

export function getAssignmentStatus(
  assignment: NormalizedAssignment,
  now: Date = new Date(),
): AssignmentStatus | null {
  if (!isPublishedAssignment(assignment)) {
    return null;
  }

  if (!assignment.dueAt) {
    return 'no-date';
  }

  const dueDate = new Date(assignment.dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  if (isSameLocalDate(dueDate, now)) {
    return 'today';
  }

  return dueDate < now ? 'overdue' : 'upcoming';
}

export function getAssignmentStatusCounts(
  assignments: NormalizedAssignment[],
  now: Date = new Date(),
): AssignmentStatusCounts {
  const counts: AssignmentStatusCounts = {
    all: 0,
    overdue: 0,
    today: 0,
    upcoming: 0,
    'no-date': 0,
  };

  for (const assignment of assignments) {
    const status = getAssignmentStatus(assignment, now);
    if (!status) {
      continue;
    }

    counts.all += 1;
    counts[status] += 1;
  }

  return counts;
}

export function isPublishedAssignment(assignment: NormalizedAssignment): boolean {
  return assignment.workflowState.toLowerCase() === 'published';
}

function compareAssignmentDates(first: NormalizedAssignment, second: NormalizedAssignment): number {
  const firstDueAt = getDueAtTimestamp(first.dueAt);
  const secondDueAt = getDueAtTimestamp(second.dueAt);

  if (firstDueAt === null && secondDueAt === null) {
    return first.name.localeCompare(second.name);
  }
  if (firstDueAt === null) return 1;
  if (secondDueAt === null) return -1;

  const dueDateComparison = firstDueAt - secondDueAt;
  return dueDateComparison || first.name.localeCompare(second.name);
}

function getDueAtTimestamp(dueAt: string | null): number | null {
  if (!dueAt) {
    return null;
  }

  const timestamp = Date.parse(dueAt);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isSameLocalDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
