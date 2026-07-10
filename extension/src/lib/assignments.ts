import type {
  AssignmentSortBy,
  AssignmentStatusFilter,
  NormalizedAssignment,
  SortOrder,
} from '../types';

export interface AssignmentFilterOptions {
  selectedCourseId?: number | null;
  searchQuery?: string;
  statusFilter?: AssignmentStatusFilter;
  sortBy?: AssignmentSortBy;
  sortOrder?: SortOrder;
  now?: Date;
}

export function filterAndSortAssignments(
  assignments: NormalizedAssignment[],
  options: AssignmentFilterOptions = {},
): NormalizedAssignment[] {
  const {
    selectedCourseId = null,
    searchQuery = '',
    statusFilter = 'upcoming',
    sortBy = 'date',
    sortOrder = 'asc',
    now = new Date(),
  } = options;

  let filtered = [...assignments];

  if (selectedCourseId) {
    filtered = filtered.filter((assignment) => assignment.courseId === selectedCourseId);
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    filtered = filtered.filter((assignment) => {
      return (
        assignment.name.toLowerCase().includes(normalizedQuery) ||
        assignment.courseName.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  if (statusFilter === 'upcoming') {
    filtered = filtered.filter((assignment) => {
      return Boolean(assignment.dueAt && new Date(assignment.dueAt) >= now);
    });
  } else if (statusFilter === 'overdue') {
    filtered = filtered.filter((assignment) => {
      return Boolean(assignment.dueAt && new Date(assignment.dueAt) < now);
    });
  } else if (statusFilter === 'no-date') {
    filtered = filtered.filter((assignment) => !assignment.dueAt);
  }

  return filtered.sort((first, second) => {
    const comparison =
      sortBy === 'date'
        ? compareAssignmentDates(first, second)
        : first.courseName.localeCompare(second.courseName);

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function sortAssignmentsByDueDate(
  assignments: NormalizedAssignment[],
): NormalizedAssignment[] {
  return [...assignments].sort(compareAssignmentDates);
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
