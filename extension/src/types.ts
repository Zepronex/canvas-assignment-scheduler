export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string | null;
  workflow_state?: string;
  access_restricted_by_date?: boolean;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  course_id: number;
  due_at: string | null;
  points_possible: number | null;
  html_url: string;
  workflow_state: string;
  updated_at: string;
}

export interface NormalizedAssignment {
  id: CanvasAssignment['id'];
  courseId: CanvasCourse['id'];
  courseName: string;
  name: string;
  dueAt: string | null;
  htmlUrl: string;
  pointsPossible: number | null;
  workflowState: string;
  updatedAt: string;
}

export interface CanvasSettings {
  canvasUrl: string;
  canvasToken: string;
}

export interface AssignmentSyncResult {
  courses: CanvasCourse[];
  assignments: NormalizedAssignment[];
  lastSyncedAt: string;
  /** Optional only for compatibility with caches created before partial sync support. */
  failedCourseCount?: number;
}

export type AssignmentNotes = Record<string, string>;

export type AssignmentSortBy = 'date' | 'course';
export type AssignmentStatus = 'overdue' | 'today' | 'upcoming' | 'no-date';
export type AssignmentStatusFilter = 'all' | AssignmentStatus;
export type SortOrder = 'asc' | 'desc';
