import type {
  Assignment,
  AssignmentSortBy,
  AssignmentStatusFilter,
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
  assignments: Assignment[],
  options: AssignmentFilterOptions = {},
): Assignment[] {
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
    filtered = filtered.filter((assignment) => assignment.course_id === selectedCourseId);
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    filtered = filtered.filter((assignment) => {
      return (
        assignment.name.toLowerCase().includes(normalizedQuery) ||
        assignment.course_name.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  if (statusFilter === 'upcoming') {
    filtered = filtered.filter((assignment) => {
      return Boolean(assignment.due_at && new Date(assignment.due_at) >= now);
    });
  } else if (statusFilter === 'overdue') {
    filtered = filtered.filter((assignment) => {
      return Boolean(assignment.due_at && new Date(assignment.due_at) < now);
    });
  } else if (statusFilter === 'no-date') {
    filtered = filtered.filter((assignment) => !assignment.due_at);
  }

  return filtered.sort((first, second) => {
    const comparison =
      sortBy === 'date'
        ? compareAssignmentDates(first, second)
        : first.course_name.localeCompare(second.course_name);

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

function compareAssignmentDates(first: Assignment, second: Assignment): number {
  if (!first.due_at) return 1;
  if (!second.due_at) return -1;
  return new Date(first.due_at).getTime() - new Date(second.due_at).getTime();
}
